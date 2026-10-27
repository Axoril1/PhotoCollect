import React, { createContext, useState, useEffect, useCallback, useRef } from "react";
import socketClient from "./socketClient";

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // disconnected, connected, reconnecting, offline
  const [presenceStats, setPresenceStats] = useState({
    currentlyViewing: 0,
    currentlyUploading: 0,
    recentlyActive: 0,
  });
  const [activityFeed, setActivityFeed] = useState([]);
  const heartbeatTimer = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    const socket = socketClient.connect();

    const onConnect = () => {
      setConnectionStatus("connected");
      // Start heartbeat to maintain "recently active" guest presence
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = setInterval(() => {
        socketClient.socket?.emit("heartbeat");
      }, 30000);
      socketClient.socket?.emit("heartbeat"); // Initial heartbeat
    };

    const onDisconnect = (reason) => {
      if (reason === "io client disconnect") {
        setConnectionStatus("disconnected");
      } else {
        setConnectionStatus("offline");
      }
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
    };

    const onReconnectAttempt = () => {
      setConnectionStatus("reconnecting");
    };

    const onPresenceUpdate = (stats) => {
      setPresenceStats(stats);
    };

    const onNewActivity = (activity) => {
      setActivityFeed((prev) => {
        // Phase 5: limit activity history length to 15 items
        const updated = [activity, ...prev];
        return updated.slice(0, 15);
      });
    };

    socketClient.on("connect", onConnect);
    socketClient.on("disconnect", onDisconnect);
    socketClient.on("reconnect_attempt", onReconnectAttempt);
    socketClient.on("reconnect", onConnect);
    socketClient.on("presence_update", onPresenceUpdate);
    socketClient.on("new_activity", onNewActivity);

    // Initial connection trigger
    if (socketClient.socket?.connected) {
      onConnect();
    }

    return () => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
      }
      socketClient.off("connect", onConnect);
      socketClient.off("disconnect", onDisconnect);
      socketClient.off("reconnect_attempt", onReconnectAttempt);
      socketClient.off("reconnect", onConnect);
      socketClient.off("presence_update", onPresenceUpdate);
      socketClient.off("new_activity", onNewActivity);
      socketClient.disconnect();
    };
  }, []);

  const joinEventRoom = useCallback((slug, eventPassword, nickname) => {
    socketClient.joinRoom(slug, eventPassword, nickname);
  }, []);

  const reportUploading = useCallback((isUploading) => {
    socketClient.reportUploadStatus(isUploading);
  }, []);

  const reportDownload = useCallback(() => {
    socketClient.reportDownload();
  }, []);

  const value = {
    socketClient,
    connectionStatus,
    presenceStats,
    activityFeed,
    setActivityFeed,
    joinEventRoom,
    reportUploading,
    reportDownload,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
export default SocketProvider;
