export function Lobby({
  playerName,
  roomCodeInput,
  statusMessage,
  isConnected,
  isBusy,
  onPlayerNameChange,
  onRoomCodeChange,
  onCreateRoom,
  onJoinRoom,
  onBack
}) {
  return (
    <section className="lobby-card">
      <div className="screen-actions">
        <button type="button" className="ghost-btn" onClick={onBack}>
          Ana Menuye Don
        </button>
      </div>

      <h1>Online 2 Kisilik Eslestirme</h1>
      <p className="subtext">Bir oda olusturun veya oda koduyla oyuna katilin.</p>

      <div className="connection-pill" data-online={isConnected}>
        {isConnected ? "Sunucuya bagli" : "Sunucuya baglaniyor..."}
      </div>

      <label className="field-label" htmlFor="playerName">
        Oyuncu Adi
      </label>
      <input
        id="playerName"
        type="text"
        maxLength={24}
        value={playerName}
        onChange={(event) => onPlayerNameChange(event.target.value)}
        placeholder="Adinizi yazin"
      />

      <div className="lobby-actions">
        <button type="button" disabled={isBusy || !isConnected} onClick={onCreateRoom}>
          Oda Olustur
        </button>
      </div>

      <label className="field-label" htmlFor="roomCode">
        Oda Kodu
      </label>
      <input
        id="roomCode"
        type="text"
        maxLength={6}
        value={roomCodeInput}
        onChange={(event) => onRoomCodeChange(event.target.value)}
        placeholder="Orn: A1B2C3"
      />

      <div className="lobby-actions">
        <button type="button" disabled={isBusy || !isConnected} onClick={onJoinRoom}>
          Odaya Katil
        </button>
      </div>

      <p className="status-line">{statusMessage}</p>
    </section>
  );
}
