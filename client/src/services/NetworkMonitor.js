class NetworkMonitor {
  constructor() {
    this.listeners = new Set();
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.connectionType = 'good'; // 'good' | 'slow' | 'offline'

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleStatusChange(true));
      window.addEventListener('offline', () => this.handleStatusChange(false));

      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        conn.addEventListener('change', () => this.checkConnectionQuality(conn));
        this.checkConnectionQuality(conn);
      }
    }
  }

  handleStatusChange(online) {
    this.isOnline = online;
    if (!online) {
      this.connectionType = 'offline';
    } else {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        this.checkConnectionQuality(conn);
      } else {
        this.connectionType = 'good';
      }
    }
    this.notify();
  }

  checkConnectionQuality(conn) {
    if (!this.isOnline) {
      this.connectionType = 'offline';
      return;
    }
    const type = conn.effectiveType;
    if (type === 'slow-2g' || type === '2g' || type === '3g' || conn.saveData) {
      this.connectionType = 'slow';
    } else {
      this.connectionType = 'good';
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback({ isOnline: this.isOnline, connectionType: this.connectionType });
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = { isOnline: this.isOnline, connectionType: this.connectionType };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in NetworkMonitor subscriber:', err);
      }
    }
  }
}

export default new NetworkMonitor();
