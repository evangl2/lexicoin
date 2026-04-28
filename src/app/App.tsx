import { PersonaProvider } from "@/app/context/PersonaContext";
import { AudioProvider } from "@/app/context/AudioContext";

function GameShell() {
  // TODO(pixi Stage C): 在此挂载 <PixiRoot />
  return (
    <div
      className="w-full h-screen bg-black overflow-hidden relative"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export default function App() {
  return (
    <PersonaProvider>
      <AudioProvider>
        <GameShell />
      </AudioProvider>
    </PersonaProvider>
  );
}
