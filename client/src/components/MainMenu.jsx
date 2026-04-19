const MODE_OPTIONS = [
  {
    id: "online",
    title: "Online Oyna",
    description: "Internet uzerinden 2 kisi"
  },
  {
    id: "same-device",
    title: "Ayni Cihazda Oyna",
    description: "Ayni bilgisayar veya telefonda sirayla"
  },
  {
    id: "local-device",
    title: "Telefon veya Bilgisayarda Yerel Oyna",
    description: "Tek cihazda kolay oyun"
  }
];

export function MainMenu({ onSelectMode }) {
  return (
    <section className="menu-card">
      <h1>Eslestirme Oyunu</h1>
      <p className="subtext">Oyuna baslamadan once bir oyun modu secin.</p>

      <div className="mode-grid">
        {MODE_OPTIONS.map((mode) => (
          <button key={mode.id} type="button" className="mode-button" onClick={() => onSelectMode(mode.id)}>
            <span className="mode-title">{mode.title}</span>
            <span className="mode-description">{mode.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
