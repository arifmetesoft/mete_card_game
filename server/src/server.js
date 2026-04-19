import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { EVENTS } from "./constants.js";
import { RoomService } from "./roomService.js";

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOrigin = CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN;

const app = express();
app.use(cors({ origin: corsOrigin }));
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mete-game-server"
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

const roomService = new RoomService(io);

function respond(callback, payload) {
  if (typeof callback === "function") {
    callback(payload);
  }
}

io.on("connection", (socket) => {
  socket.on(EVENTS.ROOM_CREATE, (payload, callback) => {
    const result = roomService.createRoom(socket.id, payload?.playerName);
    if (!result.ok) {
      respond(callback, result);
      return;
    }

    socket.join(result.roomCode);
    roomService.broadcastUpdate(result.roomCode);

    respond(callback, {
      ok: true,
      roomCode: result.roomCode,
      playerSlot: result.playerSlot,
      state: roomService.getSerializedState(result.roomCode)
    });
  });

  socket.on(EVENTS.ROOM_JOIN, (payload, callback) => {
    const result = roomService.joinRoom(socket.id, payload?.roomCode, payload?.playerName);
    if (!result.ok) {
      respond(callback, result);
      return;
    }

    socket.join(result.roomCode);

    if (result.shouldStart) {
      roomService.startGame(result.roomCode);
    } else {
      roomService.broadcastUpdate(result.roomCode);
    }

    respond(callback, {
      ok: true,
      roomCode: result.roomCode,
      playerSlot: result.playerSlot,
      state: roomService.getSerializedState(result.roomCode)
    });
  });

  socket.on(EVENTS.CARD_SELECT, (payload, callback) => {
    const result = roomService.handleCardSelect(socket.id, payload?.cardIndex);
    respond(callback, result);

    if (!result.ok) {
      socket.emit(EVENTS.APP_ERROR, { message: result.message });
    }
  });

  socket.on(EVENTS.GAME_RESTART, (_payload, callback) => {
    const result = roomService.restartGame(socket.id);
    respond(callback, result);

    if (!result.ok) {
      socket.emit(EVENTS.APP_ERROR, { message: result.message });
    }
  });

  socket.on("disconnect", () => {
    roomService.handleDisconnect(socket.id);
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
