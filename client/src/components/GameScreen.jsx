function getPlayer(gameState, slot) {
  return gameState.players.find((player) => player.slot === slot) || {
    slot,
    name: `Oyuncu ${slot}`,
    connected: false
  };
}

function getWinnerText(gameState, playerOne, playerTwo) {
  if (!gameState.over) return null;
  if (gameState.winnerSlot === 1) return `${playerOne.name} kazandi!`;
  if (gameState.winnerSlot === 2) return `${playerTwo.name} kazandi!`;
  return "Oyun berabere!";
}

export function GameScreen({
  gameState,
  session,
  statusMessage,
  isConnected,
  onCardSelect,
  onRestart,
  onBack
}) {
  const playerOne = getPlayer(gameState, 1);
  const playerTwo = getPlayer(gameState, 2);

  const capturedByPlayerOne = gameState.cards.filter((card) => card.owner === 1);
  const capturedByPlayerTwo = gameState.cards.filter((card) => card.owner === 2);
  const boardCards = gameState.cards.filter((card) => card.owner === null);

  const bothPlayersConnected = playerOne.connected && playerTwo.connected;
  const myTurn = gameState.turn === session.playerSlot && gameState.started && !gameState.locked;
  const winnerText = getWinnerText(gameState, playerOne, playerTwo);
  const roomStatus = statusMessage || gameState.infoMessage;

  return (
    <section className="game-page">
      <header className="game-header">
        <div>
          <h1>Online Eslestirme Oyunu</h1>
          <p className="subtext">
            Oda: <strong>{gameState.roomCode}</strong>
          </p>
        </div>
        <div className="header-statuses">
          <span className="pill" data-online={isConnected}>
            {isConnected ? "Bagli" : "Baglanti koptu"}
          </span>
          <span className="pill">Rolunuz: Oyuncu {session.playerSlot}</span>
          <button type="button" className="ghost-btn" onClick={onBack}>
            Ana Menuye Don
          </button>
        </div>
      </header>

      <section className="score-strip">
        <div className="score-box player-one">
          <span>{playerOne.name}</span>
          <strong>{gameState.scores[1]}</strong>
        </div>
        <div className="score-box turn-box">
          <span>Sira</span>
          <strong>{getPlayer(gameState, gameState.turn).name}</strong>
        </div>
        <div className="score-box player-two">
          <span>{playerTwo.name}</span>
          <strong>{gameState.scores[2]}</strong>
        </div>
      </section>

      <section className="game-layout">
        <aside className="panel">
          <h2>{playerOne.name} Kartlari</h2>
          <div className="owner-grid">
            {capturedByPlayerOne.length === 0 && <p className="muted">Henuz eslesme yok.</p>}
            {capturedByPlayerOne.map((card) => (
              <div key={card.id} className="owner-card player-one">
                {card.value}
              </div>
            ))}
          </div>
        </aside>

        <section className="panel board-panel">
          <h2>Oyun Alani</h2>
          {!gameState.started && !gameState.over && (
            <p className="muted">Oyun baslamasi icin iki oyuncu bagli olmali.</p>
          )}

          <div className="board-grid">
            {boardCards.map((card) => {
              const canSelect =
                myTurn && !card.isRevealed && !gameState.over && !gameState.locked && bothPlayersConnected;

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!canSelect}
                  className={`memory-card ${card.isRevealed ? "revealed" : "hidden"}`}
                  onClick={() => onCardSelect(card.id)}
                >
                  {card.value || "?"}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel">
          <h2>{playerTwo.name} Kartlari</h2>
          <div className="owner-grid align-right">
            {capturedByPlayerTwo.length === 0 && <p className="muted">Henuz eslesme yok.</p>}
            {capturedByPlayerTwo.map((card) => (
              <div key={card.id} className="owner-card player-two">
                {card.value}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer className="game-footer">
        <p className="status-line">{roomStatus}</p>
        {winnerText && <p className="winner-line">{winnerText}</p>}
        {!winnerText && !myTurn && gameState.started && <p className="muted">Rakip hamlesi bekleniyor.</p>}
        {!winnerText && myTurn && <p className="muted">Hamle sirasi sizde.</p>}

        <button
          type="button"
          className="restart-btn"
          onClick={onRestart}
          disabled={!bothPlayersConnected || gameState.locked}
        >
          Oyunu Yeniden Baslat
        </button>
      </footer>
    </section>
  );
}
