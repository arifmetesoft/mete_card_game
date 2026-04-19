import { EVENTS, PAIR_SYMBOLS, TURN_RESOLVE_DELAY_MS } from "./constants.js";
import { generateRoomCode, normalizePlayerName, parseCardIndex, shuffle } from "./utils.js";

function createEmptyRoom(code) {
  return {
    code,
    players: {
      1: null,
      2: null
    },
    started: false,
    over: false,
    locked: false,
    turn: 1,
    scores: {
      1: 0,
      2: 0
    },
    cards: [],
    selections: [],
    winnerSlot: null,
    infoMessage: "Oda olusturuldu. Rakip oyuncu bekleniyor.",
    resolveTimer: null
  };
}

function hasTwoPlayers(room) {
  return Boolean(room.players[1] && room.players[2]);
}

function getFallbackPlayerName(slot) {
  return `Oyuncu ${slot}`;
}

export class RoomService {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketIndex = new Map();
  }

  createRoom(socketId, playerName) {
    if (this.socketIndex.has(socketId)) {
      return { ok: false, message: "Bu baglanti zaten bir odada." };
    }

    const roomCode = generateRoomCode(this.rooms);
    const room = createEmptyRoom(roomCode);
    room.players[1] = {
      socketId,
      name: normalizePlayerName(playerName, getFallbackPlayerName(1))
    };
    room.infoMessage = `${room.players[1].name} odayi olusturdu. Rakip oyuncu bekleniyor.`;

    this.rooms.set(roomCode, room);
    this.socketIndex.set(socketId, { roomCode, slot: 1 });

    return {
      ok: true,
      roomCode,
      playerSlot: 1
    };
  }

  joinRoom(socketId, roomCodeInput, playerName) {
    if (this.socketIndex.has(socketId)) {
      return { ok: false, message: "Bu baglanti zaten bir odada." };
    }

    const roomCode = typeof roomCodeInput === "string" ? roomCodeInput.trim().toUpperCase() : "";
    if (!roomCode) {
      return { ok: false, message: "Oda kodu gerekli." };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, message: "Oda bulunamadi." };
    }

    const slot = this.getJoinableSlot(room);
    if (!slot) {
      return { ok: false, message: "Oda dolu." };
    }

    room.players[slot] = {
      socketId,
      name: normalizePlayerName(playerName, getFallbackPlayerName(slot))
    };
    room.infoMessage = `${room.players[slot].name} odaya katildi.`;

    this.socketIndex.set(socketId, { roomCode, slot });

    return {
      ok: true,
      roomCode,
      playerSlot: slot,
      shouldStart: hasTwoPlayers(room)
    };
  }

  startGame(roomCode, message = "Oyun basladi.") {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, message: "Oda bulunamadi." };
    }

    if (!hasTwoPlayers(room)) {
      return { ok: false, message: "Oyun icin iki oyuncu gerekli." };
    }

    this.clearResolveTimer(room);

    const values = shuffle([...PAIR_SYMBOLS, ...PAIR_SYMBOLS]);
    room.cards = values.map((value, id) => ({
      id,
      value,
      owner: null
    }));
    room.scores = { 1: 0, 2: 0 };
    room.selections = [];
    room.locked = false;
    room.turn = 1;
    room.started = true;
    room.over = false;
    room.winnerSlot = null;
    room.infoMessage = message;

    const state = this.serializeRoom(room);
    this.io.to(roomCode).emit(EVENTS.GAME_START, state);
    this.io.to(roomCode).emit(EVENTS.GAME_UPDATE, state);

    return { ok: true, state };
  }

  restartGame(socketId) {
    const context = this.socketIndex.get(socketId);
    if (!context) {
      return { ok: false, message: "Once bir odaya katilmalisiniz." };
    }

    const room = this.rooms.get(context.roomCode);
    if (!room) {
      return { ok: false, message: "Oda bulunamadi." };
    }

    if (!hasTwoPlayers(room)) {
      return { ok: false, message: "Yeniden baslatmak icin iki oyuncu bagli olmali." };
    }

    return this.startGame(context.roomCode, "Oyun yeniden baslatildi.");
  }

  handleCardSelect(socketId, rawCardIndex) {
    const context = this.socketIndex.get(socketId);
    if (!context) {
      return { ok: false, message: "Once bir odaya katilmalisiniz." };
    }

    const room = this.rooms.get(context.roomCode);
    if (!room) {
      return { ok: false, message: "Oda bulunamadi." };
    }

    if (!room.started || room.over) {
      return { ok: false, message: "Oyun aktif degil." };
    }

    if (room.locked) {
      return { ok: false, message: "Hamle cozuluyor, bekleyin." };
    }

    if (room.turn !== context.slot) {
      return { ok: false, message: "Sira sizde degil." };
    }

    const cardIndex = parseCardIndex(rawCardIndex);
    if (cardIndex === null) {
      return { ok: false, message: "Gecersiz kart secimi." };
    }

    const card = room.cards[cardIndex];
    if (!card) {
      return { ok: false, message: "Kart bulunamadi." };
    }

    if (card.owner !== null) {
      return { ok: false, message: "Bu kart zaten eslesti." };
    }

    if (room.selections.includes(cardIndex)) {
      return { ok: false, message: "Ayni karti tekrar secemezsiniz." };
    }

    room.selections.push(cardIndex);

    if (room.selections.length === 1) {
      room.infoMessage = `${this.getPlayerName(room, context.slot)} ilk karti secti.`;
      this.broadcastUpdate(context.roomCode);
      return { ok: true };
    }

    const [firstIndex, secondIndex] = room.selections;
    const firstCard = room.cards[firstIndex];
    const secondCard = room.cards[secondIndex];
    const isMatch = firstCard.value === secondCard.value;

    room.locked = true;
    if (isMatch) {
      firstCard.owner = context.slot;
      secondCard.owner = context.slot;
      room.scores[context.slot] += 1;
      room.infoMessage = `${this.getPlayerName(room, context.slot)} dogru eslesme yapti (+1).`;
    } else {
      room.infoMessage = "Yanlis eslesme.";
    }

    this.broadcastUpdate(context.roomCode);
    this.clearResolveTimer(room);

    room.resolveTimer = setTimeout(() => {
      const latestRoom = this.rooms.get(context.roomCode);
      if (!latestRoom) return;
      if (!latestRoom.started) return;

      latestRoom.resolveTimer = null;
      latestRoom.selections = [];
      latestRoom.locked = false;
      latestRoom.turn = latestRoom.turn === 1 ? 2 : 1;

      if (this.isGameOver(latestRoom)) {
        latestRoom.started = false;
        latestRoom.over = true;
        latestRoom.winnerSlot = this.resolveWinnerSlot(latestRoom);
        const gameOverMessage = this.getGameOverMessage(latestRoom);
        latestRoom.infoMessage = gameOverMessage;

        const finalState = this.serializeRoom(latestRoom);
        this.io.to(latestRoom.code).emit(EVENTS.GAME_UPDATE, finalState);
        this.io.to(latestRoom.code).emit(EVENTS.GAME_OVER, {
          message: gameOverMessage,
          winnerSlot: latestRoom.winnerSlot,
          state: finalState
        });
        return;
      }

      latestRoom.infoMessage = `Sira: ${this.getPlayerName(latestRoom, latestRoom.turn)}.`;
      this.broadcastUpdate(latestRoom.code);
    }, TURN_RESOLVE_DELAY_MS);

    return { ok: true };
  }

  handleDisconnect(socketId) {
    const context = this.socketIndex.get(socketId);
    if (!context) return;

    this.socketIndex.delete(socketId);
    const room = this.rooms.get(context.roomCode);
    if (!room) return;

    const leavingPlayer = room.players[context.slot];
    if (leavingPlayer && leavingPlayer.socketId === socketId) {
      room.players[context.slot] = null;
    }

    this.clearResolveTimer(room);
    room.started = false;
    room.over = false;
    room.locked = false;
    room.turn = 1;
    room.cards = [];
    room.scores = { 1: 0, 2: 0 };
    room.selections = [];
    room.winnerSlot = null;

    if (!room.players[1] && !room.players[2]) {
      this.rooms.delete(context.roomCode);
      return;
    }

    const disconnectedName = leavingPlayer?.name || getFallbackPlayerName(context.slot);
    const disconnectMessage = `${disconnectedName} baglantidan ayrildi.`;
    room.infoMessage = `${disconnectMessage} Yeni oyuncu bekleniyor.`;

    this.io.to(context.roomCode).emit(EVENTS.PLAYER_DISCONNECTED, {
      slot: context.slot,
      message: disconnectMessage
    });
    this.broadcastUpdate(context.roomCode);
  }

  broadcastUpdate(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    this.io.to(roomCode).emit(EVENTS.GAME_UPDATE, this.serializeRoom(room));
  }

  getSerializedState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    return this.serializeRoom(room);
  }

  getJoinableSlot(room) {
    if (!room.players[1]) return 1;
    if (!room.players[2]) return 2;
    return null;
  }

  getPlayerName(room, slot) {
    return room.players[slot]?.name || getFallbackPlayerName(slot);
  }

  isGameOver(room) {
    if (room.cards.length === 0) return false;
    return room.cards.every((card) => card.owner !== null);
  }

  resolveWinnerSlot(room) {
    if (room.scores[1] > room.scores[2]) return 1;
    if (room.scores[2] > room.scores[1]) return 2;
    return null;
  }

  getGameOverMessage(room) {
    if (room.winnerSlot === 1) {
      return `${this.getPlayerName(room, 1)} kazandi!`;
    }
    if (room.winnerSlot === 2) {
      return `${this.getPlayerName(room, 2)} kazandi!`;
    }
    return "Oyun berabere!";
  }

  clearResolveTimer(room) {
    if (!room.resolveTimer) return;
    clearTimeout(room.resolveTimer);
    room.resolveTimer = null;
  }

  serializeRoom(room) {
    const selections = new Set(room.selections);
    const players = [1, 2].map((slot) => ({
      slot,
      name: this.getPlayerName(room, slot),
      connected: Boolean(room.players[slot])
    }));

    return {
      roomCode: room.code,
      started: room.started,
      over: room.over,
      locked: room.locked,
      turn: room.turn,
      scores: {
        1: room.scores[1],
        2: room.scores[2]
      },
      players,
      cards: room.cards.map((card) => {
        const isMatched = card.owner !== null;
        const isRevealed = selections.has(card.id);
        return {
          id: card.id,
          owner: card.owner,
          isMatched,
          isRevealed,
          value: isMatched || isRevealed ? card.value : null
        };
      }),
      winnerSlot: room.winnerSlot,
      winnerName: room.winnerSlot ? this.getPlayerName(room, room.winnerSlot) : null,
      infoMessage: room.infoMessage
    };
  }
}
