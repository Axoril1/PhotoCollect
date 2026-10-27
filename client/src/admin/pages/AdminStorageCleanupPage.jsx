import { useState } from "react";
import { Trash2, ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import storageApi from "../services/storageApi.js";

export function AdminStorageCleanupPage() {
  const [isDryRun, setIsDryRun] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunCleanup = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const res = await storageApi.runCleanup(isDryRun);
      setResult(res);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to execute cleanup");
    } finally {
      setIsRunning(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await storageApi.runVerify();
      alert(res.message);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to verify integrity");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage Cleanup & Integrity Center"
        description="Detect orphaned R2 objects, verify database consistency, and purge unreferenced media files."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCard title="Orphaned File Purge Tool">
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Scans Cloudflare R2 object storage and local filesystem volumes for files that no longer exist in MongoDB.
            </p>

            <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              <span>Dry-Run Mode (Simulation only, no files deleted)</span>
            </label>

            <button
              onClick={handleRunCleanup}
              disabled={isRunning}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow transition-all disabled:opacity-50"
            >
              <Trash2 className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Executing Cleanup..." : "Execute Orphan Cleanup"}</span>
            </button>

            {result && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-semibold">
                {result.message}
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Object Integrity Verification">
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Validates that every database record points to an existing binary object in Cloudflare R2 with valid checksums.
            </p>

            <button
              onClick={handleVerifyIntegrity}
              disabled={isVerifying}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <ShieldCheck className={`w-4 h-4 text-emerald-400 ${isVerifying ? "animate-spin" : ""}`} />
              <span>{isVerifying ? "Verifying Storage Objects..." : "Run Object Integrity Verification"}</span>
            </button>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

export default AdminStorageCleanupPage;
