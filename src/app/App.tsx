import { PersonaProvider } from "@/app/context/PersonaContext";
import { AudioProvider } from "@/app/context/AudioContext";
import { PixiPersonaBridge } from "@/app/components/ui/canvas/PixiPersonaBridge";
import { PixiRoot } from "@/app/components/ui/canvas/PixiRoot";

function GameShell() {
  return (
    <div
      className="w-full h-screen bg-black overflow-hidden relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      <PixiPersonaBridge />
      <PixiRoot />
    </div>
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
