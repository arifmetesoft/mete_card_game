import { useEffect, useRef, useState } from "react";

const SYMBOLS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const MATCH_DELAY_MS = 450;
const MISS_DELAY_MS = 900;

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createDeck() {
  return shuffle([...SYMBOLS, ...SYMBOLS]).map((value, id) => ({
    id,
    value,
    owner: null,
    isRevealed: false
  }));
}

function getModeMeta(mode) {
  if (mode === "same-device") {
    return {
      title: "Ayni Cihazda Oyna",
      description: "Ayni bilgisayar veya telefonda 2 kisi sirayla oynar."
    };
  }

  return {
    title: "Telefon veya Bilgisayarda Yerel Oyna",
    description: "Mobil ve masaustu icin tek cihazda kolay oyun."
  };
}

export function LocalGame({ mode, onBack }) {
  const modeMeta = getModeMeta(mode);
  const timerRef = useRef(null);

  const [player1Input, setPlayer1Input] = useState("Oyuncu 1");
  const [player2Input, setPlayer2Input] = useState("Oyuncu 2");
  const [playerNames, setPlayerNames] = useState({ 1: "Oyuncu 1", 2: "Oyuncu 2" });
  const [cards, setCards] = useState([]);
  const [turn, setTurn] = useState(1);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [locked, setLocked] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [winnerSlot, setWinnerSlot] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Baslamak icin oyuncu adlarini girip oyunu baslatin.");

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  function clearResolveTimer() {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function getName(slot, fallback) {
    const inputValue = slot === 1 ? player1Input : player2Input;
    const trimmed = inputValue.trim();
    return trimmed || fallback;
  }

  function startGame(restart = false) {
    clearResolveTimer();

    const nextNames = {
      1: getName(1, "Oyuncu 1"),
      2: getName(2, "Oyuncu 2")
    };

    setPlayerNames(nextNames);
    setCards(createDeck());
    setTurn(1);
    setScores({ 1: 0, 2: 0 });
    setSelectedIds([]);
    setLocked(false);
    setGameStarted(true);
    setWinnerSlot(null);
    setStatusMessage(restart ? "Yerel oyun yeniden baslatildi." : "Yerel oyun basladi.");
  }

  function getWinner(nextScores, nextNames) {
    if (nextScores[1] > nextScores[2]) {
      return {
        slot: 1,
        message: `${nextNames[1]} kazandi!`
      };
    }

    if (nextScores[2] > nextScores[1]) {
      return {
        slot: 2,
        message: `${nextNames[2]} kazandi!`
      };
    }

    return {
      slot: null,
      message: "Oyun berabere!"
    };
  }

  function handleCardSelect(cardId) {
    if (!gameStarted || locked || winnerSlot !== null) return;

    const clickedCard = cards.find((card) => card.id === cardId);
    if (!clickedCard || clickedCard.owner !== null || clickedCard.isRevealed) return;

    const activeTurn = turn;
    const revealedCards = cards.map((card) =>
      card.id === cardId ? { ...card, isRevealed: true } : card
    );
    const nextSelections = [...selectedIds, cardId];

    setCards(revealedCards);
    setSelectedIds(nextSelections);

    if (nextSelections.length < 2) {
      setStatusMessage(`${playerNames[activeTurn]} ilk karti secti.`);
      return;
    }

    setLocked(true);
    clearResolveTimer();

    const [firstId, secondId] = nextSelections;
    const firstCard = revealedCards.find((card) => card.id === firstId);
    const secondCard = revealedCards.find((card) => card.id === secondId);
    const isMatch = Boolean(firstCard && secondCard && firstCard.value === secondCard.value);

    if (isMatch) {
      setStatusMessage(`Dogru eslesme! ${playerNames[activeTurn]} +1 puan kazandi.`);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        const matchedCards = revealedCards.map((card) =>
          nextSelections.includes(card.id)
            ? { ...card, owner: activeTurn, isRevealed: false }
            : card
        );
        const nextScores = {
          ...scores,
          [activeTurn]: scores[activeTurn] + 1
        };

        setCards(matchedCards);
        setScores(nextScores);
        setSelectedIds([]);

        const allMatched = matchedCards.every((card) => card.owner !== null);
        if (allMatched) {
          const winner = getWinner(nextScores, playerNames);
          setWinnerSlot(winner.slot);
          setGameStarted(false);
          setLocked(false);
          setStatusMessage(winner.message);
          return;
        }

        const nextTurn = activeTurn === 1 ? 2 : 1;
        setTurn(nextTurn);
        setLocked(false);
        setStatusMessage(`Sira: ${playerNames[nextTurn]}.`);
      }, MATCH_DELAY_MS);

      return;
    }

    setStatusMessage("Yanlis eslesme.");

    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      setCards((prevCards) =>
        prevCards.map((card) =>
          nextSelections.includes(card.id) ? { ...card, isRevealed: false } : card
        )
      );
      setSelectedIds([]);

      const nextTurn = activeTurn === 1 ? 2 : 1;
      setTurn(nextTurn);
      setLocked(false);
      setStatusMessage(`Sira: ${playerNames[nextTurn]}.`);
    }, MISS_DELAY_MS);
  }

  function handleBackToMenu() {
    clearResolveTimer();
    onBack();
  }

  const boardCards = cards.filter((card) => card.owner === null);
  const capturedByPlayer1 = cards.filter((card) => card.owner === 1);
  const capturedByPlayer2 = cards.filter((card) => card.owner === 2);

  return (
    <section className="game-page">
      <header className="game-header">
        <div>
          <h1>{modeMeta.title}</h1>
          <p className="subtext">{modeMeta.description}</p>
        </div>
        <div className="header-statuses">
          <span className="pill">Yerel Mod</span>
          <button type="button" className="ghost-btn" onClick={handleBackToMenu}>
            Ana Menuye Don
          </button>
        </div>
      </header>

      <section className="panel local-setup">
        <h2>Oyuncu Ayarlari</h2>
        <p className="muted">Dokunmatik ve masaustu kullanimina uygundur.</p>
        <div className="name-grid">
          <input
            type="text"
            maxLength={24}
            value={player1Input}
            onChange={(event) => setPlayer1Input(event.target.value)}
            placeholder="Oyuncu 1"
          />
          <input
            type="text"
            maxLength={24}
            value={player2Input}
            onChange={(event) => setPlayer2Input(event.target.value)}
            placeholder="Oyuncu 2"
          />
        </div>
        <div className="local-actions">
          <button type="button" className="primary-btn" onClick={() => startGame(false)}>
            Oyunu Baslat
          </button>
          <button
            type="button"
            className="restart-btn"
            disabled={cards.length === 0}
            onClick={() => startGame(true)}
          >
            Yeniden Baslat
          </button>
        </div>
      </section>

      <section className="score-strip">
        <div className="score-box player-one">
          <span>{playerNames[1]}</span>
          <strong>{scores[1]}</strong>
        </div>
        <div className="score-box turn-box">
          <span>Sira</span>
          <strong>{playerNames[turn]}</strong>
        </div>
        <div className="score-box player-two">
          <span>{playerNames[2]}</span>
          <strong>{scores[2]}</strong>
        </div>
      </section>

      <section className="game-layout">
        <aside className="panel">
          <h2>{playerNames[1]} Kartlari</h2>
          <div className="owner-grid">
            {capturedByPlayer1.length === 0 && <p className="muted">Henuz eslesme yok.</p>}
            {capturedByPlayer1.map((card) => (
              <div key={card.id} className="owner-card player-one">
                {card.value}
              </div>
            ))}
          </div>
        </aside>

        <section className="panel board-panel">
          <h2>Oyun Alani</h2>
          {!gameStarted && cards.length === 0 && <p className="muted">Oyun henuz baslatilmadi.</p>}

          <div className="board-grid">
            {boardCards.map((card) => {
              const canSelect = gameStarted && !locked && !card.isRevealed;
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`memory-card ${card.isRevealed ? "revealed" : "hidden"}`}
                  disabled={!canSelect}
                  onClick={() => handleCardSelect(card.id)}
                >
                  {card.isRevealed ? card.value : "?"}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel">
          <h2>{playerNames[2]} Kartlari</h2>
          <div className="owner-grid align-right">
            {capturedByPlayer2.length === 0 && <p className="muted">Henuz eslesme yok.</p>}
            {capturedByPlayer2.map((card) => (
              <div key={card.id} className="owner-card player-two">
                {card.value}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer className="game-footer">
        <p className="status-line">{statusMessage}</p>
      </footer>
    </section>
  );
}

