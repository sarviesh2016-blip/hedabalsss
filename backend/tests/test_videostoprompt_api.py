"""End-to-end backend tests for VideosToPrompt.com API."""
import os
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://v2p-studio.preview.emergentagent.com").rstrip("/")
TEST_VIDEO = Path("/tmp/test.mp4")


def _no_id_leak(obj):
    """Recursive check for '_id' leaks."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked in {list(obj.keys())}"
        for v in obj.values():
            _no_id_leak(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_id_leak(v)


# ---------- Health / Liveness ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("service") == "videostoprompt"

    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ---------- Auth ----------
class TestAuth:
    def test_me_no_auth(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, user_client, user_creds):
        r = user_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        for k in ("user_id", "email", "name", "role", "credits", "plan"):
            assert k in data, f"missing {k} in /auth/me response"
        assert data["user_id"] == user_creds["user_id"]
        assert data["role"] == "user"
        assert data["credits"] == 100
        assert data["plan"] == "pro"

    def test_invalid_token(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer bogus_token_xyz"})
        assert r.status_code == 401


# ---------- Video upload ----------
class TestVideoUpload:
    def test_upload_success(self, user_client, request):
        assert TEST_VIDEO.exists(), "test video missing"
        with open(TEST_VIDEO, "rb") as f:
            r = user_client.post(
                f"{BASE_URL}/api/upload/video",
                files={"file": ("test.mp4", f, "video/mp4")},
            )
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        assert "video_id" in data and data["video_id"].startswith("vid_")
        assert "file_url" in data
        assert data["status"] == "uploaded"
        # Iteration 2: duration + thumbnail_url fields
        assert "duration" in data, "upload response missing duration"
        assert "thumbnail_url" in data, "upload response missing thumbnail_url"
        # valid mp4 should produce non-null duration via ffprobe
        assert data["duration"] is not None, "duration should not be None for a valid mp4"
        assert isinstance(data["duration"], (int, float)) and data["duration"] > 0
        request.config.cache.set("video_id", data["video_id"])

    def test_upload_invalid_ext(self, user_client):
        files = {"file": ("malicious.exe", b"hello", "application/octet-stream")}
        r = user_client.post(f"{BASE_URL}/api/upload/video", files=files)
        assert r.status_code == 400

    def test_upload_too_large(self, user_client):
        # 101 MB of zero bytes
        big = b"\0" * (101 * 1024 * 1024)
        files = {"file": ("big.mp4", big, "video/mp4")}
        r = user_client.post(f"{BASE_URL}/api/upload/video", files=files, timeout=120)
        assert r.status_code in (413, 400)

    def test_list_videos(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/videos")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert isinstance(data, list) and len(data) >= 1


# ---------- Prompt generation (ASYNC iteration 2) ----------
class TestGeneration:
    def test_generate_prompt_async_starts(self, user_client, request):
        video_id = request.config.cache.get("video_id", None)
        assert video_id, "Upload test must run first"
        # Capture credits before
        r0 = user_client.get(f"{BASE_URL}/api/user/credits")
        request.config.cache.set("credits_before_gen", r0.json()["credits"])

        payload = {"video_id": video_id, "selected_model": "veo", "style_preset": "cinematic"}
        r = user_client.post(f"{BASE_URL}/api/generate-prompt", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        assert "generation_id" in data
        assert data["status"] in ("processing", "queued"), f"expected processing/queued, got {data['status']}"
        request.config.cache.set("generation_id", data["generation_id"])

    def test_generate_prompt_polls_to_completion(self, user_client, request):
        gen_id = request.config.cache.get("generation_id", None)
        assert gen_id
        # Poll up to 240s. NOTE: emergentintegrations uses SYNC litellm.completion
        # which blocks the asyncio event loop, causing transient 502s from ingress
        # for the duration of the AI call (incl. internal retries on 502 from
        # upstream). This is a real architectural issue worth flagging to main agent.
        deadline = time.time() + 240
        last = None
        while time.time() < deadline:
            try:
                r = user_client.get(f"{BASE_URL}/api/generations/{gen_id}", timeout=15)
            except requests.RequestException:
                time.sleep(3)
                continue
            if r.status_code >= 500:
                time.sleep(3)
                continue
            assert r.status_code == 200, r.text
            last = r.json()
            if last.get("status") == "completed":
                break
            time.sleep(3)
        assert last and last["status"] == "completed", f"generation did not complete in 240s: {last}"
        _no_id_leak(last)
        out = last["output"]
        for k in ("summary", "shortPrompt", "detailedPrompt", "sceneBreakdown", "modelPrompts"):
            assert k in out, f"missing {k} in output"
        assert isinstance(out["sceneBreakdown"], list)
        for m in ("veo", "sora", "kling", "runway", "midjourney", "flux"):
            assert m in out["modelPrompts"]
        # LLM key budget exhausted -> expect fallback path
        assert last.get("used_fallback") is True, "expected used_fallback=True (LLM key budget exhausted)"

    def test_credit_refunded_on_fallback(self, user_client, request):
        before = request.config.cache.get("credits_before_gen", None)
        assert before is not None
        # Allow a few retries because the event loop may still be busy
        for _ in range(10):
            try:
                r = user_client.get(f"{BASE_URL}/api/user/credits", timeout=15)
                if r.status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(3)
        assert r.status_code == 200, r.text
        after = r.json()["credits"]
        # Because used_fallback=True, credit should be refunded -> equal to before
        assert after == before, f"credit not refunded: before={before}, after={after}"

    def test_credit_refunded_on_fallback(self, user_client, request):
        before = request.config.cache.get("credits_before_gen", None)
        assert before is not None
        r = user_client.get(f"{BASE_URL}/api/user/credits")
        assert r.status_code == 200
        after = r.json()["credits"]
        # Because used_fallback=True, credit should be refunded -> equal to before
        assert after == before, f"credit not refunded: before={before}, after={after}"

    def test_list_generations(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/generations")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert isinstance(data, list) and len(data) >= 1

    def test_get_generation(self, user_client, request):
        gen_id = request.config.cache.get("generation_id", None)
        assert gen_id
        r = user_client.get(f"{BASE_URL}/api/generations/{gen_id}")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert data["generation_id"] == gen_id


# ---------- Saved prompts ----------
class TestSavedPrompts:
    def test_save_prompt(self, user_client, request):
        gen_id = request.config.cache.get("generation_id", None)
        assert gen_id
        r = user_client.post(
            f"{BASE_URL}/api/save-prompt",
            json={"generation_id": gen_id, "title": "TEST_my saved"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        assert data["title"] == "TEST_my saved"
        assert "saved_id" in data
        request.config.cache.set("saved_id", data["saved_id"])

    def test_list_saved(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/saved-prompts")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert isinstance(data, list) and len(data) >= 1

    def test_delete_saved(self, user_client, request):
        saved_id = request.config.cache.get("saved_id", None)
        assert saved_id
        r = user_client.delete(f"{BASE_URL}/api/saved-prompts/{saved_id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # Verify it's gone
        r = user_client.get(f"{BASE_URL}/api/saved-prompts")
        ids = [s["saved_id"] for s in r.json()]
        assert saved_id not in ids


# ---------- Credits / Plans ----------
class TestCreditsAndPlans:
    def test_user_credits(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/user/credits")
        assert r.status_code == 200
        data = r.json()
        assert "credits" in data and "plan" in data

    def test_plans(self, api):
        r = api.get(f"{BASE_URL}/api/payments/plans")
        assert r.status_code == 200, r.text
        data = r.json()
        plans = {p["id"]: p for p in data["plans"]}
        for k in ("starter", "pro", "studio", "pack_50", "pack_150", "pack_500"):
            assert k in plans
        assert data["configured"] is False  # placeholder mode


# ---------- Payments (placeholder mode) ----------
class TestPayments:
    def test_create_order(self, user_client, request):
        r = user_client.post(f"{BASE_URL}/api/payments/create-order", json={"plan_or_pack": "pack_50"})
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        order = data["order"]
        assert order["id"].startswith("order_mock_")
        assert data["mock"] is True
        assert data["payment"]["status"] == "created"
        assert data["payment"]["credits_granted"] == 50
        request.config.cache.set("order_id", order["id"])

    def test_verify_order(self, user_client, request, user_creds):
        order_id = request.config.cache.get("order_id", None)
        assert order_id
        r0 = user_client.get(f"{BASE_URL}/api/user/credits")
        credits_before_pay = r0.json()["credits"]
        r = user_client.post(
            f"{BASE_URL}/api/payments/verify",
            json={
                "razorpay_order_id": order_id,
                "razorpay_payment_id": f"pay_fake_{int(time.time())}",
                "razorpay_signature": "fake_signature_xyz",
            },
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        # 50 credits granted for pack_50
        assert data["credits"] == credits_before_pay + 50

    def test_payment_history(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/payments/history")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert isinstance(data, list) and len(data) >= 1


# ---------- API Keys ----------
class TestAPIKeys:
    def test_create_key(self, user_client, request):
        r = user_client.post(f"{BASE_URL}/api/api-keys/create", json={"name": "TEST_Production"})
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        assert "key" in data and data["key"].startswith("vtp_")
        assert "key_prefix" in data
        request.config.cache.set("api_key_id", data["api_key_id"])

    def test_list_keys_no_hash(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/api-keys")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert isinstance(data, list) and len(data) >= 1
        for k in data:
            assert "key_hash" not in k, "key_hash should not be returned in list"

    def test_delete_key(self, user_client, request):
        kid = request.config.cache.get("api_key_id", None)
        assert kid
        r = user_client.delete(f"{BASE_URL}/api/api-keys/{kid}")
        assert r.status_code == 200


# ---------- Contact ----------
class TestContact:
    def test_contact_public(self, api):
        r = api.post(
            f"{BASE_URL}/api/contact",
            json={
                "name": "TEST_Tester",
                "email": "tester@example.com",
                "subject": "Hello",
                "message": "Hi there",
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True


# ---------- Admin gating ----------
class TestAdminGating:
    def test_user_cannot_access_admin(self, user_client):
        r = user_client.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 403

    def test_admin_stats(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("total_users", "total_revenue_inr", "total_generations", "failed_jobs"):
            assert k in data

    def test_admin_users(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200
        data = r.json()
        _no_id_leak(data)
        assert isinstance(data, list) and len(data) >= 1

    def test_admin_payments(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/payments")
        assert r.status_code == 200
        _no_id_leak(r.json())

    def test_admin_generations(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/generations")
        assert r.status_code == 200
        _no_id_leak(r.json())

    def test_admin_integration_keys_get(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/integration-keys")
        assert r.status_code == 200
        data = r.json()
        assert "razorpay_key_id" in data
        assert "razorpay_key_secret_masked" in data

    def test_admin_logs(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/logs")
        assert r.status_code == 200
        _no_id_leak(r.json())


# ---------- Admin actions ----------
class TestAdminActions:
    def test_credits_adjust(self, admin_client, user_creds, user_client):
        # Get current
        r = user_client.get(f"{BASE_URL}/api/user/credits")
        before = r.json()["credits"]
        r = admin_client.post(
            f"{BASE_URL}/api/admin/credits/adjust",
            json={"user_id": user_creds["user_id"], "delta": 50, "reason": "TEST_promo"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        assert data["credits"] == before + 50
        # Verify a log entry was written
        r = admin_client.get(f"{BASE_URL}/api/admin/logs")
        logs = r.json()
        assert any(
            l.get("action") == "credit_adjust" and l.get("target_user_id") == user_creds["user_id"]
            for l in logs
        )

    def test_integration_keys_update(self, admin_client):
        new_id = "rzp_live_xxx_TEST"
        r = admin_client.put(
            f"{BASE_URL}/api/admin/integration-keys",
            json={"razorpay_key_id": new_id, "razorpay_key_secret": "supersecret123456"},
        )
        assert r.status_code == 200
        # Verify GET returns it
        r = admin_client.get(f"{BASE_URL}/api/admin/integration-keys")
        data = r.json()
        assert data["razorpay_key_id"] == new_id
        # Secret should be masked, not the raw value
        assert "supersecret123456" not in data.get("razorpay_key_secret_masked", "")
        assert "•••" in data["razorpay_key_secret_masked"] or "..." in data["razorpay_key_secret_masked"]
        # Cleanup: reset to placeholder
        admin_client.put(
            f"{BASE_URL}/api/admin/integration-keys",
            json={"razorpay_key_id": "", "razorpay_key_secret": ""},
        )



# ---------- Iteration 2: Public site-config ----------
class TestPublicSiteConfig:
    REQUIRED_KEYS = [
        "google_client_id", "ga_measurement_id", "gtm_id", "fb_pixel_id",
        "google_site_verification", "bing_site_verification",
        "seo_default_title", "seo_default_description", "og_image_url",
    ]

    def test_public_site_config_no_auth(self, api):
        r = api.get(f"{BASE_URL}/api/site-config")
        assert r.status_code == 200, r.text
        data = r.json()
        _no_id_leak(data)
        for k in self.REQUIRED_KEYS:
            assert k in data, f"missing public key: {k}"
        # Secrets must NEVER leak
        assert "google_client_secret" not in data
        assert "gemini_api_key" not in data
        assert "razorpay_key_secret" not in data


# ---------- Iteration 2: Admin site-config GET/PUT ----------
class TestAdminSiteConfig:
    def test_admin_get_site_config(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/site-config")
        assert r.status_code == 200, r.text
        # initial is {} or whatever previously set; must be dict
        assert isinstance(r.json(), dict)

    def test_admin_put_site_config_and_public_reflects(self, admin_client, api):
        payload = {
            "ga_measurement_id": "G-TEST",
            "gtm_id": "GTM-X",
            "seo_default_title": "Test",
        }
        r = admin_client.put(f"{BASE_URL}/api/admin/site-config", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert set(body.get("updated", [])) >= set(payload.keys())

        # Admin GET reflects
        r = admin_client.get(f"{BASE_URL}/api/admin/site-config")
        cfg = r.json()
        for k, v in payload.items():
            assert cfg.get(k) == v, f"admin site-config did not persist {k}"

        # Public GET reflects
        r = api.get(f"{BASE_URL}/api/site-config")
        public = r.json()
        for k, v in payload.items():
            assert public.get(k) == v, f"public site-config did not reflect {k}"


# ---------- Iteration 2: Admin integration-keys extended ----------
class TestAdminIntegrationKeysExtended:
    def test_put_extended_keys(self, admin_client):
        payload = {
            "gemini_api_key": "AIzaTEST1234567890ABCD",
            "google_client_id": "xxx.apps.googleusercontent.com",
            "google_client_secret": "GOCSPX-test12345",
        }
        r = admin_client.put(f"{BASE_URL}/api/admin/integration-keys", json=payload)
        assert r.status_code == 200, r.text

        r = admin_client.get(f"{BASE_URL}/api/admin/integration-keys")
        data = r.json()
        # google_client_id is non-secret -> verbatim
        assert data["google_client_id"] == "xxx.apps.googleusercontent.com"
        # Secrets masked
        gm = data.get("gemini_api_key_masked", "")
        gcs = data.get("google_client_secret_masked", "")
        assert "AIzaTEST1234567890ABCD" not in gm
        assert "GOCSPX-test12345" not in gcs
        # 4 + bullets + 4 pattern for sufficiently long secrets (>10 chars)
        assert gm.startswith("AIza") and gm.endswith("ABCD") and "•" in gm
        assert gcs.startswith("GOCS") and gcs.endswith("2345") and "•" in gcs
        # raw secrets never in response keys
        for k in data.keys():
            assert k not in ("gemini_api_key", "google_client_secret"), f"raw secret key leaked: {k}"

    def test_public_site_config_reflects_google_client_id(self, admin_client, api):
        # ensure prior PUT applied
        r = api.get(f"{BASE_URL}/api/site-config")
        assert r.status_code == 200
        assert r.json().get("google_client_id") == "xxx.apps.googleusercontent.com"


# ---------- Iteration 2: Own-managed Google OAuth verify ----------
class TestGoogleOwnVerify:
    def test_verify_without_client_id_returns_503(self, api):
        """Clear google_client_id via pymongo, hit endpoint, expect 503."""
        from pymongo import MongoClient
        import os as _os
        cli = MongoClient(_os.environ["MONGO_URL"])
        db = cli[_os.environ["DB_NAME"]]
        # snapshot existing
        prior = db.settings.find_one({"key": "integration_keys"}) or {}
        prior_value = prior.get("value", {}) if prior else {}
        # write a state without google_client_id
        new_value = {k: v for k, v in prior_value.items() if k != "google_client_id"}
        db.settings.update_one(
            {"key": "integration_keys"},
            {"$set": {"key": "integration_keys", "value": new_value}},
            upsert=True,
        )
        try:
            r = api.post(
                f"{BASE_URL}/api/auth/google-own/verify",
                json={"credential": "invalid.jwt.token"},
            )
            assert r.status_code == 503, r.text
            assert "not configured" in r.json().get("detail", "").lower()
        finally:
            # restore
            db.settings.update_one(
                {"key": "integration_keys"},
                {"$set": {"key": "integration_keys", "value": prior_value}},
                upsert=True,
            )
            cli.close()

    def test_verify_invalid_token_returns_401(self, admin_client, api):
        # Ensure client_id is configured first
        admin_client.put(
            f"{BASE_URL}/api/admin/integration-keys",
            json={"google_client_id": "xxx.apps.googleusercontent.com"},
        )
        r = api.post(
            f"{BASE_URL}/api/auth/google-own/verify",
            json={"credential": "invalid.jwt.token"},
        )
        assert r.status_code == 401, r.text
        detail = r.json().get("detail", "")
        assert detail.startswith("Invalid Google token"), f"unexpected detail: {detail}"
