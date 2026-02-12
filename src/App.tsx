import "./App.css";
import BackgroundMusic from "./BackgroundMusic";
import TamagotchiContainer from "./TamagotchiContainer";

function App() {
  return (
    <main className="app-shell">
      <TamagotchiContainer />
      <BackgroundMusic src="/bgm.mp3" title="Cute Cat Meow Song" creator="Juncala" />
      <div className="app-credit" aria-live="polite">
        Project by Manixh, Feb 2026
      </div>
    </main>
  );
}

export default App;
