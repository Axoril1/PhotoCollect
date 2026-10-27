import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Sliders,
  Upload,
  ShieldCheck,
  HardDrive,
  Lock,
  Mail,
  Cpu,
  Palette,
  ToggleLeft,
  AlertTriangle,
  Save,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import settingsApi from "../services/settingsApi.js";
import { useAdminAuth } from "../hooks/useAdminAuth.js";

export function AdminSettingsPage() {
  const { isSuperAdmin } = useAdminAuth();

  const [activeSection, setActiveSection] = useState("general");
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await settingsApi.getAllSettings();
      setSettings(response.settings || {});
    } catch (err) {
      console.error("[SettingsPage] Failed to fetch settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSection = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    // Filter settings belonging to active section
    const sectionPrefix = `${activeSection}.`;
    const updates = {};
    Object.entries(settings).forEach(([key, val]) => {
      if (key.startsWith(sectionPrefix)) {
        updates[key] = val;
      }
    });

    try {
      await settingsApi.updateSectionSettings(activeSection, updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const navSections = [
    { id: "general", label: "General", icon: Settings },
    { id: "uploads", label: "Upload Limits", icon: Upload },
    { id: "moderation", label: "AI Moderation", icon: ShieldCheck },
    { id: "storage", label: "Storage & R2", icon: HardDrive },
    { id: "authentication", label: "Authentication", icon: Lock },
    { id: "security", label: "Security & Policy", icon: Lock },
    { id: "feature_flags", label: "Feature Flags", icon: ToggleLeft },
    { id: "maintenance", label: "Maintenance Mode", icon: AlertTriangle },
  ];

  if (isLoading) {
    return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings & Configuration Center"
        description="Centralized control panel for system behavior, upload limits, feature flags, and maintenance mode."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Section Navigation Sidebar */}
        <div className="space-y-1 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl h-fit">
          {navSections.map((sec) => {
            const IconComponent = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-lg font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Configuration Panel */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSaveSection} className="space-y-6">
            {/* 1. General Settings */}
            {activeSection === "general" && (
              <AdminCard title="General Platform Settings">
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Platform Brand Name</label>
                    <input
                      type="text"
                      value={settings["general.platformName"] || "QR Snap"}
                      onChange={(e) => handleSettingChange("general.platformName", e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">System Support Email</label>
                    <input
                      type="email"
                      value={settings["general.supportEmail"] || "support@qrsnap.app"}
                      onChange={(e) => handleSettingChange("general.supportEmail", e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Default System Timezone</label>
                    <select
                      value={settings["general.timezone"] || "UTC"}
                      onChange={(e) => handleSettingChange("general.timezone", e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">EST (Eastern Standard Time)</option>
                      <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                      <option value="Asia/Tokyo">JST (Japan Standard Time)</option>
                    </select>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* 2. Upload Settings */}
            {activeSection === "uploads" && (
              <AdminCard title="Upload Limits & Compression">
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Max Upload File Size (Bytes)</label>
                    <input
                      type="number"
                      value={settings["uploads.maxUploadSizeBytes"] || 15728640}
                      onChange={(e) => handleSettingChange("uploads.maxUploadSizeBytes", Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">15,728,640 bytes = 15 MB</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Max Images Per Upload Batch</label>
                    <input
                      type="number"
                      value={settings["uploads.maxImagesPerUpload"] || 25}
                      onChange={(e) => handleSettingChange("uploads.maxImagesPerUpload", Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Image Compression Quality (1-100)</label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={settings["uploads.compressionQuality"] || 85}
                      onChange={(e) => handleSettingChange("uploads.compressionQuality", Number(e.target.value))}
                      className="w-full accent-amber-500 bg-slate-950"
                    />
                    <span className="text-[10px] text-amber-400 font-mono block mt-1">Quality: {settings["uploads.compressionQuality"] || 85}%</span>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* 3. AI Moderation */}
            {activeSection === "moderation" && (
              <AdminCard title="AI Content Moderation Settings">
                <div className="space-y-4 text-xs">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <span className="font-semibold text-slate-200">Enable Google Vision API</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings["moderation.enableGoogleVision"])}
                      onChange={(e) => handleSettingChange("moderation.enableGoogleVision", e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <span className="font-semibold text-slate-200">Enable NSFWJS Local Model</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings["moderation.enableNsfwjs"])}
                      onChange={(e) => handleSettingChange("moderation.enableNsfwjs", e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500"
                    />
                  </label>
                </div>
              </AdminCard>
            )}

            {/* 4. Storage */}
            {activeSection === "storage" && (
              <AdminCard title="Cloud Storage Configuration">
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Primary Storage Provider</label>
                    <input
                      type="text"
                      disabled
                      value={(settings["storage.provider"] || "r2").toUpperCase()}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Signed URL Expiration (Seconds)</label>
                    <input
                      type="number"
                      value={settings["storage.signedUrlExpirationSeconds"] || 3600}
                      onChange={(e) => handleSettingChange("storage.signedUrlExpirationSeconds", Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            {/* 5. Feature Flags */}
            {activeSection === "feature_flags" && (
              <AdminCard title="Feature Flags & Staged Rollout" subtitle="Toggle modular system capabilities dynamically">
                <div className="space-y-3 text-xs">
                  {[
                    { key: "feature_flags.enableAiModeration", label: "AI Content Moderation Engine" },
                    { key: "feature_flags.enableAnalytics", label: "Platform Data Analytics Suite" },
                    { key: "feature_flags.enableReports", label: "Community Abuse Reporting Flow" },
                    { key: "feature_flags.enableDownloads", label: "Gallery Bulk Zip Downloads" },
                    { key: "feature_flags.enableExperimental", label: "Experimental Features Staging" },
                  ].map((flag) => (
                    <label key={flag.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                      <span className="font-semibold text-slate-200">{flag.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(settings[flag.key])}
                        onChange={(e) => handleSettingChange(flag.key, e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-amber-500"
                      />
                    </label>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* 6. Maintenance Mode */}
            {activeSection === "maintenance" && (
              <AdminCard title="Maintenance Mode Controls">
                <div className="space-y-4 text-xs">
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 cursor-pointer">
                    <div>
                      <span className="font-bold text-rose-400 block">Enable Platform Maintenance Mode</span>
                      <span className="text-[11px] text-slate-400">Blocks non-admin access to QR Snap</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings["maintenance.modeEnabled"])}
                      onChange={(e) => handleSettingChange("maintenance.modeEnabled", e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-500"
                    />
                  </label>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Maintenance Banner Message</label>
                    <textarea
                      value={settings["general.maintenanceMessage"] || "QR Snap is under scheduled maintenance."}
                      onChange={(e) => handleSettingChange("general.maintenanceMessage", e.target.value)}
                      rows={3}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {saveSuccess && <span className="text-xs font-bold text-emerald-400">Configuration saved!</span>}
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
