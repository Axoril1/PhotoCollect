import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Event from "../models/Event.js";
import bcrypt from "bcryptjs";
import {
  generateFriendlyNickname,
  registerSocketRoom,
  updateSocketUploading,
  updateSocketActivity,
  removeSocketPresence,
  getSocketNickname,
  getPresenceStats,
  getSocketRoom,
} from "./eventRooms.js";

let io;

export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected client: ${socket.id}`);

    // Pre-authenticate organizer socket if token is present
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.user = decoded;
        const userId = decoded.id || decoded._id;
        if (userId) {
          socket.join(`user:${userId}`);
          console.log(`[Socket] User ${userId} joined room user:${userId}`);
        }
      } catch (err) {
        console.warn(`[Socket] Token verification failed: ${err.message}`);
      }
    }

    // Handle room joining (Phase 3 & 11)
    socket.on("join_room", async ({ slug, eventPassword, nickname }) => {
      try {
        const event = await Event.findOne({ slug });
        if (!event) {
          socket.emit("join_error", "Event not found");
          return;
        }

        const roomId = `event:${event._id}`;
        
        // Security check: check password access if required and not owner
        const isOwner = socket.user && event.ownerId && event.ownerId.toString() === socket.user._id.toString();
        
        if (event.password && !isOwner) {
          const suppliedPassword = eventPassword || "";
          const allowed = await bcrypt.compare(suppliedPassword, event.password);
          if (!allowed) {
            socket.emit("join_error", "Unauthorized: Invalid event password");
            return;
          }
        }

        // Leave any previous event rooms
        socket.rooms.forEach((room) => {
          if (room.startsWith("event:") && room !== roomId) {
            socket.leave(room);
          }
        });
        const prevRoom = removeSocketPresence(socket.id);
        if (prevRoom && prevRoom !== roomId) {
          broadcastPresenceStats(prevRoom);
        }

        // Join the new room
        socket.join(roomId);
        
        // Generate nickname and register presence
        const name = nickname || generateFriendlyNickname();
        registerSocketRoom(socket.id, roomId, name);

        console.log(`[Socket] Client ${socket.id} (${name}) joined room ${roomId}`);

        // Broadcast "John joined the gallery" (Phase 5)
        io.to(roomId).emit("new_activity", {
          id: `${socket.id}-join-${Date.now()}`,
          type: "join",
          text: `${name} joined the gallery`,
          userName: name,
          timestamp: new Date().toISOString(),
        });

        // Broadcast updated stats & presence counts (Phase 6 & 7)
        broadcastPresenceStats(roomId);

      } catch (err) {
        console.error("[Socket] Join room error:", err);
        socket.emit("join_error", "Server error during join");
      }
    });

    // Client reports upload status (Phase 7)
    socket.on("upload_status", ({ isUploading }) => {
      updateSocketUploading(socket.id, isUploading);
      const roomId = getSocketRoom(socket.id);
      if (roomId) {
        broadcastPresenceStats(roomId);
      }
    });

    // Client reports download (Phase 5)
    socket.on("report_download", () => {
      const roomId = getSocketRoom(socket.id);
      const name = getSocketNickname(socket.id);
      if (roomId) {
        io.to(roomId).emit("new_activity", {
          id: `download-${Date.now()}`,
          type: "download",
          text: `${name} downloaded the gallery`,
          userName: name,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Client reports page activity (heartbeat / presence)
    socket.on("heartbeat", () => {
      updateSocketActivity(socket.id);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected client: ${socket.id}`);
      const roomId = removeSocketPresence(socket.id);
      if (roomId) {
        broadcastPresenceStats(roomId);
      }
    });
  });

  const broadcastPresenceStats = (roomId) => {
    if (!io) return;
    const stats = getPresenceStats(roomId);
    io.to(roomId).emit("presence_update", stats);
  };
};

export const getIO = () => io;

// Broadcast helper for controller actions (Phase 3 & 4)
export const broadcastToEvent = (eventId, eventName, data) => {
  if (io) {
    io.to(`event:${eventId}`).emit(eventName, data);
  }
};

// Dispatch notification to specific user socket room
export const sendNotificationToUser = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }
};
