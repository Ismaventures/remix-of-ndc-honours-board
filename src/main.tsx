import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { autoSeedIfNeeded } from "./lib/localDb.ts";
import "./index.css";

async function init() {
  await autoSeedIfNeeded();
  createRoot(document.getElementById("root")!).render(<App />);
}

init();
