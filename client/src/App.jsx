import { useEffect, useMemo, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { Lobby } from "./components/Lobby";
import { LocalGame } from "./components/LocalGame";
import { MainMenu } from "./components/MainMenu";
import { EVENTS } from "./constants";
import { socket } from "./socket";

function normalizeRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function emitWithAck(eventName, payload) {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, message: "Sunucuya bagli degil." });
      return;
    }

    socket.timeout(5000).emit(eventName, payload, (error, response) => {
      if (error) {
        resolve({ ok: false, message: "Sunucu yanit vermedi." });
        return;
      }

      resolve(response || { ok: false, message: "Gecersiz sunucu yaniti." });
    });
  });
}

function resolveScreen(selectedMode, session, gameState) {
  if (!selectedMode) return "main-menu";
  if (selectedMode === "online") {
    if (!session || !gameState) return "online-lobby";
    return "online-game";
  }
  return "local-game";
}

export default function App() {
  const [selectedMode, setSelectedMode] = useState(null);

  const [playerName, setPlayerName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Bir oyun modu secin.");
  const [session, setSession] = useState(null);
  const [gameState, setGameState] = useState(null);

  const currentScreen = useMemo(
    () => resolveScreen(selectedMode, session, gameState),
    [selectedMode, session, gameState]
  );

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      if (selectedMode === "online") {
        setStatusMessage((prev) =>
          prev === "Sunucuya baglaniyor..." || prev.includes("baglanti")
            ? "Sunucuya baglanildi."
            : prev
        );
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      if (selectedMode === "online") {
        setStatusMessage("Sunucu baglantisi koptu. Yeniden baglaniyor...");
      }
    };

    const handleGameStart = (state) => {
      setGameState(state);
      setStatusMessage(state.infoMessage || "Oyun basladi.");
    };

    const handleGameUpdate = (state) => {
      setGameState(state);
      if (state.infoMessage) {
        setStatusMessage(state.infoMessage);
      }
    };

    const handleGameOver = (payload) => {
      if (payload?.state) {
        setGameState(payload.state);
      }
      if (payload?.message) {
        setStatusMessage(payload.message);
      }
    };

    const handlePlayerDisconnected = (payload) => {
      setStatusMessage(payload?.message || "Bir oyuncunun baglantisi kesildi.");
    };

    const handleAppError = (payload) => {
      if (payload?.message) {
        setStatusMessage(payload.message);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(EVENTS.GAME_START, handleGameStart);
    socket.on(EVENTS.GAME_UPDATE, handleGameUpdate);
    socket.on(EVENTS.GAME_OVER, handleGameOver);
    socket.on(EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
    socket.on(EVENTS.APP_ERROR, handleAppError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(EVENTS.GAME_START, handleGameStart);
      socket.off(EVENTS.GAME_UPDATE, handleGameUpdate);
      socket.off(EVENTS.GAME_OVER, handleGameOver);
      socket.off(EVENTS.PLAYER_DISCONNECTED, handlePlayerDisconnected);
      socket.off(EVENTS.APP_ERROR, handleAppError);
    };
  }, [selectedMode]);

  useEffect(() => {
    if (selectedMode === "online") {
      if (!socket.connected) {
        setStatusMessage("Sunucuya baglaniyor...");
        socket.connect();
      } else {
        setIsConnected(true);
      }
      return;
    }

    if (socket.connected) {
      socket.disconnect();
    }
    setIsConnected(false);
  }, [selectedMode]);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, []);

  function handleSelectMode(mode) {
    setSelectedMode(mode);
    setSession(null);
    setGameState(null);
    setIsBusy(false);
    setRoomCodeInput("");

    if (mode === "online") {
      setStatusMessage("Sunucuya baglaniyor...");
      return;
    }

    setStatusMessage("Yerel mod secildi.");
  }

  function handleBackToMainMenu() {
    setSelectedMode(null);
    setSession(null);
    setGameState(null);
    setIsBusy(false);
    setRoomCodeInput("");
    setStatusMessage("Bir oyun modu secin.");
  }

  async function handleCreateRoom() {
    if (selectedMode !== "online") return;

    const normalizedName = playerName.trim();
    if (!normalizedName) {
      setStatusMessage("Oyuncu adi gerekli.");
      return;
    }

    setIsBusy(true);
    const result = await emitWithAck(EVENTS.ROOM_CREATE, {
      playerName: normalizedName
    });
    setIsBusy(false);

    if (!result.ok) {
      setStatusMessage(result.message || "Oda olusturulamadi.");
      return;
    }

    setSession({
      roomCode: result.roomCode,
      playerSlot: result.playerSlot
    });
    setGameState(result.state);
    setRoomCodeInput(result.roomCode);
    setStatusMessage(result.state?.infoMessage || "Oda olusturuldu.");
  }

  async function handleJoinRoom() {
    if (selectedMode !== "online") return;

    const normalizedName = playerName.trim();
    const normalizedRoomCode = normalizeRoomCode(roomCodeInput);

    if (!normalizedName) {
      setStatusMessage("Oyuncu adi gerekli.");
      return;
    }

    if (!normalizedRoomCode) {
      setStatusMessage("Gecerli bir oda kodu girin.");
      return;
    }

    setIsBusy(true);
    const result = await emitWithAck(EVENTS.ROOM_JOIN, {
      roomCode: normalizedRoomCode,
      playerName: normalizedName
    });
    setIsBusy(false);

    if (!result.ok) {
      setStatusMessage(result.message || "Odaya katilinamadi.");
      return;
    }

    setSession({
      roomCode: result.roomCode,
      playerSlot: result.playerSlot
    });
    setGameState(result.state);
    setRoomCodeInput(result.roomCode);
    setStatusMessage(result.state?.infoMessage || "Odaya katildiniz.");
  }

  async function handleCardSelect(cardIndex) {
    if (selectedMode !== "online" || !session) return;

    const result = await emitWithAck(EVENTS.CARD_SELECT, {
      roomCode: session.roomCode,
      cardIndex
    });

    if (!result.ok) {
      setStatusMessage(result.message || "Kart secimi gonderilemedi.");
    }
  }

  async function handleRestartGame() {
    if (selectedMode !== "online" || !session) return;

    const result = await emitWithAck(EVENTS.GAME_RESTART, {
      roomCode: session.roomCode
    });

    if (!result.ok) {
      setStatusMessage(result.message || "Oyun yeniden baslatilamadi.");
    }
  }

  return (
    <main className="page" data-screen={currentScreen}>
      {currentScreen === "main-menu" && <MainMenu onSelectMode={handleSelectMode} />}

      {currentScreen === "online-lobby" && (
        <Lobby
          playerName={playerName}
          roomCodeInput={roomCodeInput}
          statusMessage={statusMessage}
          isConnected={isConnected}
          isBusy={isBusy}
          onPlayerNameChange={setPlayerName}
          onRoomCodeChange={(value) => setRoomCodeInput(normalizeRoomCode(value))}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBack={handleBackToMainMenu}
        />
      )}

      {currentScreen === "online-game" && (
        <GameScreen
          gameState={gameState}
          session={session}
          statusMessage={statusMessage}
          isConnected={isConnected}
          onCardSelect={handleCardSelect}
          onRestart={handleRestartGame}
          onBack={handleBackToMainMenu}
        />
      )}

      {currentScreen === "local-game" && (
        <LocalGame mode={selectedMode} onBack={handleBackToMainMenu} />
      )}
    </main>
  );
}
