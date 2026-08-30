import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Fonts are self-hosted rather than pulled from Google Fonts: the app must
// render on a dead connection (see the service worker), and a blocking
// stylesheet request in <head> is the one thing that would stop it.
//
// Anek Bangla is the app-wide family (per owner instruction): it covers
// Bengali glyphs AND Latin, so it sits first in the stack and every script
// renders through it; Outfit remains as a fallback.
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/anek-bangla/bengali-400.css";
import "@fontsource/anek-bangla/bengali-500.css";
import "@fontsource/anek-bangla/bengali-600.css";
import "@fontsource/anek-bangla/bengali-700.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
