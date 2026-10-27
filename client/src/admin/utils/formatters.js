/**
 * QR Snap Admin Formatters & Utilities
 */

export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat().format(num);
}

export function formatCurrency(amount, currency = "USD") {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStatusTheme(status) {
  const normalized = String(status || "").toLowerCase();
  switch (normalized) {
    case "active":
    case "approved":
    case "success":
    case "healthy":
    case "online":
      return "emerald";
    case "pending":
    case "warning":
    case "review":
      return "amber";
    case "suspended":
    case "rejected":
    case "failed":
    case "error":
    case "offline":
      return "rose";
    default:
      return "slate";
  }
}
