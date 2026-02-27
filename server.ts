import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Game state management
  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId, userData) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [],
          gameState: null,
        });
      }
      
      const room = rooms.get(roomId);
      const existingPlayer = room.players.find(p => p.id === socket.id);
      
      if (!existingPlayer) {
        room.players.push({
          id: socket.id,
          name: userData.name || `Player ${room.players.length + 1}`,
          animal: userData.animal || "Lion",
          color: userData.color || "red",
        });
      }

      io.to(roomId).emit("room-update", room.players);
    });

    socket.on("game-action", (roomId, action) => {
      // Broadcast action to everyone in the room
      io.to(roomId).emit("game-event", action);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Handle room cleanup if needed
      rooms.forEach((room, roomId) => {
        const index = room.players.findIndex(p => p.id === socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          io.to(roomId).emit("room-update", room.players);
        }
      });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
