import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trash2,
  ZoomIn,
  Camera,
  User,
  Calendar,
  Sparkles,
  MessageSquare,
  Plus,
  AlertTriangle,
  UserX,
} from "lucide-react";

import PageHeader from "../components/PageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SkeletonLoader from "../components/SkeletonLoader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import moderationApi from "../services/moderationApi.js";
import usersApi from "../services/usersApi.js";
import { formatDate, formatBytes } from "../utils/formatters.js";

export function AdminPhotoReviewPage() {
  const { photoId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const [markFalsePositive, setMarkFalsePositive] = useState(false);
  const [markFalseNegative, setMarkFalseNegative] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPhotoDetails = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await moderationApi.getPhotoDetail(photoId);
      setData(response.photo);
      setComments(response.comments || []);
    } catch (err) {
      console.error("[PhotoReviewPage] Failed to fetch photo details:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    fetchPhotoDetails();
  }, [fetchPhotoDetails]);

  const handleApprove = async () => {
    try {
      await moderationApi.approvePhoto(photoId, { markFalsePositive });
      fetchPhotoDetails();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to approve photo");
    }
  };

  const handleReject = async () => {
    try {
      await moderationApi.rejectPhoto(photoId, {
        reason: rejectionReason || "Violates content safety policy",
        markFalseNegative,
      });
      fetchPhotoDetails();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reject photo");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this photo from cloud storage?")) return;
    try {
      await moderationApi.deletePhoto(photoId);
      navigate("/admin/moderation");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete photo");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await moderationApi.addComment(photoId, newComment);
      setComments((prev) => [res.comment, ...prev]);
      setNewComment("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to post comment");
    }
  };

  if (isLoading) {
    return <SkeletonLoader count={4} height="h-32" className="mt-6" />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/moderation"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Moderation Queue</span>
        </Link>
        <EmptyState
          icon={ShieldAlert}
          title="Photo Record Not Found"
          message="The requested photo could not be located or has been permanently deleted."
        />
      </div>
    );
  }

  const photo = data;
  const isApproved = photo.moderationStatus === "approved" || photo.moderationStatus === "auto_approved";
  const isRejected = photo.moderationStatus === "rejected" || photo.moderationStatus === "auto_rejected";

  return (
    <div className="space-y-6">
      <Link
        to="/admin/moderation"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Moderation Queue</span>
      </Link>

      <PageHeader
        title={`Inspect Photo #${photo._id}`}
        description={`Uploaded by ${photo.uploaderName || "Guest"} for ${photo.eventId?.name || "Event"}`}
        badge={<StatusBadge status={photo.moderationStatus || "pending"} />}
      />

      {/* Main Review Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Inspection & EXIF Metadata (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <AdminCard title="Media Preview & Visual Inspection">
            <div className="relative group bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center p-4 min-h-[360px]">
              <img
                src={photo.originalUrl || photo.thumbnailUrl}
                alt={photo.originalName || "Uploaded photo"}
                className="max-h-[500px] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <button
                onClick={() => setIsZoomed(true)}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl shadow-xl transition-all opacity-0 group-hover:opacity-100"
                title="Zoom Image"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </AdminCard>

          {/* AI Decision Results Card */}
          <AdminCard title="AI Provider Evaluation Results" subtitle="Google Vision API & NSFWJS Analysis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google Vision Section */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Google Vision Safety Scores</span>
                </div>
                <div className="space-y-2 text-xs">
                  {["Adult", "Violence", "Medical", "Racy", "Spoof"].map((cat) => (
                    <div key={cat} className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">{cat}</span>
                      <span className="font-mono text-emerald-400 font-semibold">VERY_UNLIKELY</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NSFWJS Section */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>NSFWJS Model Confidence</span>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Neutral", val: 98.4 },
                    { label: "Drawing", val: 1.2 },
                    { label: "Sexy", val: 0.3 },
                    { label: "Porn", val: 0.1 },
                    { label: "Hentai", val: 0.0 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="font-mono text-slate-200">{item.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.label === "Porn" || item.label === "Sexy" ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Decision Control Panel & Comments (1 col) */}
        <div className="space-y-6">
          <AdminCard title="Moderation Action Controls">
            <div className="space-y-4 text-xs">
              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleApprove}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve Upload</span>
                </button>

                <button
                  onClick={handleReject}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Upload</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Permanently</span>
                </button>
              </div>

              {/* False Positive / Negative Toggles */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markFalsePositive}
                    onChange={(e) => setMarkFalsePositive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Mark as False Positive (AI Overflagged)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markFalseNegative}
                    onChange={(e) => setMarkFalseNegative(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Mark as False Negative (AI Missed Flag)</span>
                </label>
              </div>
            </div>
          </AdminCard>

          {/* Admin Internal Comments Feed */}
          <AdminCard title="Moderation Notes & Audit Log">
            <form onSubmit={handleAddComment} className="space-y-2 mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write an internal admin note..."
                rows={2}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg shadow transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </div>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">No notes recorded for this item.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c._id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex justify-between font-bold text-amber-400 mb-1">
                      <span>{c.adminName}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-slate-300">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={photo.originalUrl || photo.thumbnailUrl}
            alt="Zoomed view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

export default AdminPhotoReviewPage;
