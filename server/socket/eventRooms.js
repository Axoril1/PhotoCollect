// Track event room guest presence status
const roomPresence = new Map(); // roomId -> Map(socketId -> presenceState)
const socketNickname = new Map(); // socketId -> nickname
const socketRoom = new Map(); // socketId -> roomId

const friendlyNames = [
  "Emma", "John", "Sarah", "Alex", "David", "Sophia", "Michael", 
  "Emily", "Daniel", "Olivia", "Lucas", "Ava", "James", "Isabella", 
  "Benjamin", "Mia", "William", "Charlotte", "Oliver", "Amelia"
];

export const generateFriendlyNickname = () => {
  const name = friendlyNames[Math.floor(Math.random() * friendlyNames.length)];
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${name}#${suffix}`;
};

export const registerSocketRoom = (socketId, roomId, nickname) => {
  socketRoom.set(socketId, roomId);
  socketNickname.set(socketId, nickname);

  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }

  roomPresence.get(roomId).set(socketId, {
    isUploading: false,
    lastActive: Date.now(),
  });
};

export const updateSocketUploading = (socketId, isUploading) => {
  const roomId = socketRoom.get(socketId);
  if (roomId && roomPresence.has(roomId)) {
    const state = roomPresence.get(roomId).get(socketId);
    if (state) {
      state.isUploading = isUploading;
      state.lastActive = Date.now();
    }
  }
};

export const updateSocketActivity = (socketId) => {
  const roomId = socketRoom.get(socketId);
  if (roomId && roomPresence.has(roomId)) {
    const state = roomPresence.get(roomId).get(socketId);
    if (state) {
      state.lastActive = Date.now();
    }
  }
};

export const removeSocketPresence = (socketId) => {
  const roomId = socketRoom.get(socketId);
  if (roomId && roomPresence.has(roomId)) {
    roomPresence.get(roomId).delete(socketId);
    if (roomPresence.get(roomId).size === 0) {
      roomPresence.delete(roomId);
    }
  }
  socketRoom.delete(socketId);
  socketNickname.delete(socketId);
  return roomId;
};

export const getSocketNickname = (socketId) => {
  return socketNickname.get(socketId) || "A guest";
};

export const getSocketRoom = (socketId) => {
  return socketRoom.get(socketId);
};

export const getPresenceStats = (roomId) => {
  const socketsInRoom = roomPresence.get(roomId);
  if (!socketsInRoom) {
    return {
      currentlyViewing: 0,
      currentlyUploading: 0,
      recentlyActive: 0,
    };
  }

  let currentlyViewing = socketsInRoom.size;
  let currentlyUploading = 0;
  let recentlyActive = 0;
  const now = Date.now();

  socketsInRoom.forEach((state) => {
    if (state.isUploading) currentlyUploading++;
    if (now - state.lastActive < 60000) recentlyActive++; // active within last 60 seconds
  });

  return {
    currentlyViewing,
    currentlyUploading,
    recentlyActive,
  };
};
