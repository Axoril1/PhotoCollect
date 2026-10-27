import { useState, useEffect, useCallback } from "react";
import {
  Palette,
  Globe,
  Upload,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Eye,
  Type,
  Lock,
} from "lucide-react";

import brandingApi from "../services/brandingApi.js";

export function BrandingSettingsPage() {
  const [branding, setBranding] = useState({
    companyName: "QR Snap",
    primaryColor: "#f59e0b",
    secondaryColor: "#0f172a",
    accentColor: "#10b981",
    fontFamily: "Inter",
    customDomain: "",
    logoUrl: "",
    faviconUrl: "",
    emailFooterText: "",
  });
  const [domainStatus, setDomainStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState("branding"); // "branding" | "domain" | "preview"
  const [alertMessage, setAlertMessage] = useState(null);

  const fetchBrandingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [brandRes, domRes] = await Promise.all([
        brandingApi.getBranding(),
        brandingApi.getDomainStatus(),
      ]);

      if (brandRes.branding) setBranding((prev) => ({ ...prev, ...brandRes.branding }));
      setDomainStatus(domRes);
    } catch (err) {
      console.error("[BrandingSettingsPage] Error fetching branding:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandingData();
  }, [fetchBrandingData]);

  const handleSaveBranding = async () => {
    setIsSaving(true);
    try {
      const res = await brandingApi.updateBranding(branding);
      setBranding((prev) => ({ ...prev, ...res.branding }));
      setAlertMessage({ type: "success", text: "Branding settings saved successfully!" });
      await fetchBrandingData();
    } catch (err) {
      setAlertMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to save branding (Business plan required).",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await brandingApi.uploadLogo(formData);
      setBranding((prev) => ({ ...prev, logoUrl: res.logoUrl }));
      setAlertMessage({ type: "success", text: "Brand logo uploaded successfully!" });
    } catch (err) {
      alert(err.response?.data?.error || "Logo upload failed");
    }
  };

  const handleVerifyDNS = async () => {
    setIsVerifying(true);
    try {
      const res = await brandingApi.verifyDomain(branding.customDomain);
      if (res.success) {
        setAlertMessage({ type: "success", text: res.message });
      } else {
        setAlertMessage({ type: "error", text: res.message });
      }
      await fetchBrandingData();
    } catch (err) {
      setAlertMessage({ type: "error", text: err.response?.data?.error || "Domain verification failed." });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto">
        <div className="h-32 bg-slate-900 animate-pulse rounded-2xl" />
        <div className="h-64 bg-slate-900 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Palette className="w-8 h-8 text-amber-500" />
            <span>White-label Branding & Custom Domains</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Customize company logos, brand themes, email footers, and connect your custom CNAME / TXT domain.
          </p>
        </div>

        <button
          onClick={handleSaveBranding}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Branding Changes"}</span>
        </button>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            alertMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
          }`}
        >
          <span>{alertMessage.text}</span>
          <button onClick={() => setAlertMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-bold gap-6">
        <button
          onClick={() => setActiveTab("branding")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "branding" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Brand Styling & Assets</span>
        </button>

        <button
          onClick={() => setActiveTab("domain")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "domain" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Custom Domain & SSL</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "preview" ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Live Theme Preview</span>
        </button>
      </div>

      {/* Tab 1: Brand Styling & Assets */}
      {activeTab === "branding" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colors & Fonts */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
              Brand Colors & Typography
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Organization / Company Name</label>
                <input
                  type="text"
                  value={branding.companyName}
                  onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.accentColor}
                      onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Font Family</label>
                <select
                  value={branding.fontFamily}
                  onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Inter">Inter (Sans-Serif)</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Outfit">Outfit</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email Footer Text</label>
                <input
                  type="text"
                  placeholder="© 2026 Your Company. All rights reserved."
                  value={branding.emailFooterText}
                  onChange={(e) => setBranding({ ...branding, emailFooterText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Logo & Asset Uploads */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
              Brand Logos & Favicon
            </h3>

            <div className="space-y-5 text-xs">
              <div>
                <label className="block text-slate-400 mb-2 font-semibold">Company Logo</label>
                <div className="flex items-center gap-4">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl bg-slate-950 p-2 border border-slate-800" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-950 border border-dashed border-slate-800 flex items-center justify-center text-slate-600">
                      No Logo
                    </div>
                  )}

                  <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold rounded-xl cursor-pointer text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Domain & DNS Wizard */}
      {activeTab === "domain" && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Custom Domain & SSL Status</h3>
              <p className="text-xs text-slate-400">Map your own domain (e.g. photos.yourcompany.com) to QR Snap galleries.</p>
            </div>

            {domainStatus?.domainStatus === "VERIFIED" ? (
              <span className="px-3 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> VERIFIED & SSL ACTIVE
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> PENDING VERIFICATION
              </span>
            )}
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Custom Subdomain or Domain Name</label>
              <input
                type="text"
                placeholder="photos.yourcompany.com"
                value={branding.customDomain}
                onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* DNS Instructions Box */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="font-bold text-amber-400">Required DNS TXT Record for Domain Verification</h4>
              <p className="text-slate-400">Add the following TXT record to your DNS provider (Cloudflare, GoDaddy, Route53):</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block mb-0.5 font-sans">Record Host / Name:</span>
                  <span className="text-slate-200">{domainStatus?.challengeRecord || "_qrsnap-challenge.yourdomain.com"}</span>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-slate-500 block mb-0.5 font-sans">Record TXT Value:</span>
                  <span className="text-amber-400 font-bold">{domainStatus?.verificationToken || "qrsnap-verify=..."}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleVerifyDNS}
              disabled={isVerifying}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isVerifying ? "animate-spin" : ""}`} />
              <span>Verify DNS Record Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Live Theme Preview */}
      {activeTab === "preview" && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
            Live Branded Gallery Preview
          </h3>

          <div
            className="p-6 rounded-2xl border transition-all space-y-6"
            style={{
              backgroundColor: branding.secondaryColor || "#0f172a",
              borderColor: branding.primaryColor || "#f59e0b",
              fontFamily: branding.fontFamily || "Inter",
            }}
          >
            {/* Gallery Mock Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />}
                <span className="font-extrabold text-white text-base">{branding.companyName || "QR Snap"}</span>
              </div>
              <button
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-950 transition-all shadow"
                style={{ backgroundColor: branding.primaryColor || "#f59e0b" }}
              >
                Upload Photos
              </button>
            </div>

            <div className="p-8 text-center space-y-3">
              <h2 className="text-2xl font-black text-white">Welcome to {branding.companyName}'s Gallery</h2>
              <p className="text-xs text-white/70">Scan QR code or upload event photos directly.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrandingSettingsPage;
