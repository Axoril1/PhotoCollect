import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  FileText,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Copy,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import storageApi from "../services/storageApi.js";
import { formatBytes, formatDate } from "../utils/formatters.js";

export function AdminStorageBrowserPage() {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await storageApi.getFiles({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        provider: providerFilter,
      });

      setFiles(response.files || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      console.error("[StorageBrowser] Failed to load files:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, providerFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this file object?")) return;
    try {
      await storageApi.deleteFile(id);
      fetchFiles();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete file");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Storage File Explorer"
        description="Browse, inspect, and manage binary assets across Cloudflare R2 and local storage volumes."
        badge={`${pagination.total} File Objects`}
      />

      {/* Filter & View Mode Controls */}
      <div className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Filename, Photo ID, or Uploader..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl border transition-colors ${
                viewMode === "grid"
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-xl border transition-colors ${
                viewMode === "list"
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>

            <button
              onClick={fetchFiles}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List View */}
      <AdminCard>
        {isLoading ? (
          <SkeletonLoader count={6} height="h-24" />
        ) : isError ? (
          <EmptyState title="Failed to Load Storage Files" message="Unable to connect to storage directory." />
        ) : files.length === 0 ? (
          <EmptyState title="No Storage Files Found" message="No media files match your query." />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((f) => (
              <div
                key={f._id}
                className="group p-2 bg-slate-950 border border-slate-800 rounded-2xl hover:border-amber-500/50 transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-square rounded-xl bg-slate-900 overflow-hidden mb-2">
                  <img
                    src={f.thumbnailUrl || f.originalUrl}
                    alt={f.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/storage/files/${f._id}`)}
                      className="p-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                      title="Inspect Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(f._id)}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500"
                      title="Delete Object"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] space-y-0.5">
                  <span className="font-bold text-slate-200 truncate block">{f.originalName}</span>
                  <span className="text-slate-500 font-mono text-[10px] block">{formatBytes(f.sizeBytes)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Thumbnail</th>
                  <th className="px-4 py-3">Filename & Key</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Upload Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {files.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                        <img src={f.thumbnailUrl || f.originalUrl} alt={f.originalName} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-white truncate">{f.originalName}</span>
                        <span className="text-[10px] text-slate-500 font-mono truncate">{f.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-200">{formatBytes(f.sizeBytes)}</td>
                    <td className="px-4 py-3 uppercase font-mono text-[10px] text-amber-400 font-bold">
                      {f.storageProvider || "r2"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{f.eventId?.name || "General"}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(f.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/storage/files/${f._id}`)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f._id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} files total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default AdminStorageBrowserPage;
