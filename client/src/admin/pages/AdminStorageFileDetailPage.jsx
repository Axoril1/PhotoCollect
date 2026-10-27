import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  Copy,
  Trash2,
  Download,
  HardDrive,
  Cloud,
  CheckCircle,
  Calendar,
  User,
  ShieldCheck,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import storageApi from "../services/storageApi.js";
import { formatDate, formatBytes } from "../utils/formatters.js";

export function AdminStorageFileDetailPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();

  const [fileData, setFileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchFileDetail = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await storageApi.getFileDetail(fileId);
      setFileData(response.file);
    } catch (err) {
      console.error("[StorageFileDetail] Failed to fetch file:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchFileDetail();
  }, [fetchFileDetail]);

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this object from cloud storage?")) return;
    try {
      await storageApi.deleteFile(fileId);
      navigate("/admin/storage/browser");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete file");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (isLoading) return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  if (isError || !fileData) {
    return (
      <div className="space-y-6">
        <Link to="/admin/storage/browser" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to File Explorer</span>
        </Link>
        <EmptyState title="File Not Found" message="The requested storage file object does not exist." />
      </div>
    );
  }

  const f = fileData;

  return (
    <div className="space-y-6">
      <Link to="/admin/storage/browser" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Storage File Explorer</span>
      </Link>

      <PageHeader
        title={`File Object inspection: ${f.originalName}`}
        description={`Stored via ${(f.storageProvider || "r2").toUpperCase()} Storage Provider`}
        badge={<StatusBadge status={f.moderationStatus || "approved"} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Preview & Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <AdminCard title="Binary Asset Preview">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[300px]">
              <img
                src={f.originalUrl || f.thumbnailUrl}
                alt={f.originalName}
                className="max-h-[400px] w-auto object-contain rounded-xl shadow-2xl"
              />
            </div>
          </AdminCard>

          <AdminCard title="Technical Storage Metadata">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">R2 Object Key / Filename</span>
                <span className="font-mono text-amber-400">{f.filename}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">File Size</span>
                <span className="font-mono font-bold text-white">{formatBytes(f.sizeBytes)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Storage Provider</span>
                <span className="font-mono uppercase font-bold text-emerald-400">{f.storageProvider || "r2"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Associated Event</span>
                <span className="text-slate-200">{f.eventId?.name || "General"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Uploader</span>
                <span className="text-slate-200">{f.uploaderName || "Guest"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Upload Date</span>
                <span className="text-slate-200">{formatDate(f.createdAt)}</span>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Actions & URL Copy (1 col) */}
        <div className="space-y-6">
          <AdminCard title="Object Actions">
            <div className="space-y-3 text-xs">
              <button
                onClick={() => copyToClipboard(f.originalUrl)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Copy Signed Public URL</span>
              </button>

              <button
                onClick={() => copyToClipboard(f.filename)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                <span>Copy R2 Object Key</span>
              </button>

              <a
                href={f.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Download Original File</span>
              </a>

              <button
                onClick={handleDelete}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Object</span>
              </button>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

export default AdminStorageFileDetailPage;
