import { io } from "socket.io-client";
import { AUTH_TOKEN_KEY } from "../../api/axios.js";

const getSocketURL = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "";
  if (apiUrl) {
    // If VITE_API_URL ends with /api, remove it to point to the base URL
    return apiUrl.replace(/\/api\/?$/, "");
  }
  const hostname = window.location.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return `${window.location.protocol}//${hostname}:5000`;
  }
  return "http://localhost:5000";
};

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(authData = {}) {
    if (this.socket?.connected) return this.socket;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    this.socket = io(getSocketURL(), {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token,
        ...authData,
      },
    });

    // Re-bind any existing listeners to the new socket instance
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket.on(event, callback);
      });
    });

    this.socket.connect();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(slug, eventPassword, nickname) {
    if (this.socket) {
      this.socket.emit("join_room", { slug, eventPassword, nickname });
    }
  }

  reportUploadStatus(isUploading) {
    if (this.socket) {
      this.socket.emit("upload_status", { isUploading });
    }
  }

  reportDownload() {
    if (this.socket) {
      this.socket.emit("report_download");
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

const socketClient = new SocketClient();
export default socketClient;
