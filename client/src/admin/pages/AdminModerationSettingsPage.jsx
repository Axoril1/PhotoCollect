import { useState } from "react";
import { Sliders, Save, Shield, Sparkles } from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";

export function AdminModerationSettingsPage() {
  const [provider, setProvider] = useState("hybrid");
  const [visionSensitivity, setVisionSensitivity] = useState(4); // 4 = LIKELY
  const [nsfwThreshold, setNsfwThreshold] = useState(85);
  const [autoRejectThreshold, setAutoRejectThreshold] = useState(95);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Moderation Settings & Sensitivity"
        description="Configure thresholds, AI model preferences, and automated rejection boundaries."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <AdminCard title="AI Provider Priority Strategy">
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-2">Active AI Engine Strategy</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="hybrid">Hybrid Engine (Google Vision + NSFWJS Local)</option>
                <option value="google_vision">Google Vision API Only</option>
                <option value="nsfwjs">NSFWJS Local Model Only</option>
              </select>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Sensitivity & Rejection Thresholds">
          <div className="space-y-6 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1 text-slate-300">
                <span>Google Vision Flag Likelihood Cutoff</span>
                <span className="text-amber-400 font-mono">LIKELY (4/5)</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={visionSensitivity}
                onChange={(e) => setVisionSensitivity(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-950"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1 text-slate-300">
                <span>NSFWJS Model Confidence Threshold</span>
                <span className="text-amber-400 font-mono">{nsfwThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={nsfwThreshold}
                onChange={(e) => setNsfwThreshold(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-950"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1 text-slate-300">
                <span>Automated Immediate Rejection Boundary</span>
                <span className="text-amber-400 font-mono">{autoRejectThreshold}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="99"
                value={autoRejectThreshold}
                onChange={(e) => setAutoRejectThreshold(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-950"
              />
            </div>
          </div>
        </AdminCard>

        <div className="flex items-center justify-end gap-3">
          {isSaved && <span className="text-xs font-semibold text-emerald-400">Settings saved!</span>}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminModerationSettingsPage;
