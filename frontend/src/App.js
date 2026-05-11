import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "@/contexts/AuthContext";
import { SiteConfigProvider } from "@/contexts/SiteConfigContext";
import AuthCallback from "@/components/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/Login";
import MasterLogin from "@/pages/MasterLogin";
import Dashboard from "@/pages/Dashboard";
import UploadPage from "@/pages/Upload";
import PromptResult from "@/pages/PromptResult";
import SavedPrompts from "@/pages/SavedPrompts";
import Billing from "@/pages/Billing";
import ApiDocs from "@/pages/ApiDocs";
import Blog from "@/pages/Blog";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";

function AppRouter() {
  const location = useLocation();
  // Synchronous check — process session_id before normal routing
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login />} />
      <Route path="/master-login" element={<MasterLogin />} />
      <Route path="/admin-login" element={<MasterLogin />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/api-docs" element={<ApiDocs />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
      <Route path="/generations/:id" element={<ProtectedRoute><PromptResult /></ProtectedRoute>} />
      <Route path="/saved-prompts" element={<ProtectedRoute><SavedPrompts /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <SiteConfigProvider>
          <AuthProvider>
            <AppRouter />
            <Toaster theme="light" position="top-right" richColors closeButton />
          </AuthProvider>
        </SiteConfigProvider>
      </BrowserRouter>
    </div>
  );
}
