import { ROOM_CODE_LENGTH } from "./constants.js";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_PLAYER_NAME_LENGTH = 24;

export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function normalizePlayerName(name, fallback = "Oyuncu") {
  if (typeof name !== "string") return fallback;
  const trimmed = name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  return trimmed || fallback;
}

export function generateRoomCode(existingRoomMap) {
  let roomCode = "";
  do {
    roomCode = "";
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
      roomCode += ROOM_CODE_CHARS[index];
    }
  } while (existingRoomMap.has(roomCode));

  return roomCode;
}

export function parseCardIndex(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}
