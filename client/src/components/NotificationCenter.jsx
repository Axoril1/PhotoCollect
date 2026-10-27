import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Settings, ShieldAlert, Sparkles, CheckCircle2, Clock } from "lucide-react";
import notificationApi from "../services/notificationApi.js";
import { useSocket } from "../services/socket/useSocket.js";
import { formatDate } from "../admin/utils/formatters.js";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const socket = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications({ limit: 15 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error("[NotificationCenter] Error fetching notifications:", err);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await notificationApi.getPreferences();
      setPreferences(res.preferences || {});
    } catch (err) {
      console.error("[NotificationCenter] Error fetching preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  // Real-time Socket.IO notification push
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev.slice(0, 14)]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[NotificationCenter] Error marking as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[NotificationCenter] Error marking all as read:", err);
    }
  };

  const handleTogglePref = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await notificationApi.updatePreferences(updated);
    } catch (err) {
      console.error("[NotificationCenter] Error updating preferences:", err);
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-black bg-amber-500 text-slate-950 rounded-full animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 text-slate-100 overflow-hidden text-xs">
          <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-white text-sm">Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-slate-400 hover:text-amber-400 flex items-center gap-1 font-semibold"
                  title="Mark all read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`text-slate-400 hover:text-white ${showSettings ? "text-amber-400" : ""}`}
                title="Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preferences View */}
          {showSettings ? (
            <div className="p-4 space-y-3 bg-slate-900/40">
              <h4 className="font-bold text-slate-200 text-xs">Notification Channels & Categories</h4>
              <div className="space-y-2 text-slate-300">
                {[
                  { key: "inAppEnabled", label: "In-App Popups" },
                  { key: "emailEnabled", label: "Email Notifications" },
                  { key: "billing", label: "Billing & Invoices" },
                  { key: "moderation", label: "AI Moderation Alerts" },
                  { key: "uploads", label: "Photo Upload Events" },
                  { key: "security", label: "Security & Logins" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex justify-between items-center cursor-pointer py-1">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={!!preferences[key]}
                      onChange={() => handleTogglePref(key)}
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            /* Notification List View */
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-850">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No recent notifications.</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => !n.read && handleMarkAsRead(n._id)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 ${
                      n.read ? "bg-slate-950 text-slate-400" : "bg-slate-900/60 text-slate-100 font-medium hover:bg-slate-900"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {n.priority === "HIGH" || n.priority === "URGENT" ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      )}
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h5 className="font-bold truncate text-white">{n.title}</h5>
                        <span className="text-[10px] text-slate-500 shrink-0">{formatDate(n.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
