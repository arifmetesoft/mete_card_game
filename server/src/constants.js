export const EVENTS = Object.freeze({
  ROOM_CREATE: "room:create",
  ROOM_JOIN: "room:join",
  GAME_START: "game:start",
  CARD_SELECT: "card:select",
  GAME_UPDATE: "game:update",
  GAME_OVER: "game:over",
  GAME_RESTART: "game:restart",
  PLAYER_DISCONNECTED: "player:disconnected",
  APP_ERROR: "app:error"
});

export const ROOM_CODE_LENGTH = 6;

export const PAIR_SYMBOLS = Object.freeze([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H"
]);

export const TURN_RESOLVE_DELAY_MS = 900;
