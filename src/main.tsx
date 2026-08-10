import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Fonts are self-hosted rather than pulled from Google Fonts: the app must
// render on a dead connection (see the service worker), and a blocking
// stylesheet request in <head> is the one thing that would stop it.
//
// Outfit carries the Latin text and owns the visual identity. It has no
// Bengali coverage at all -- not even the taka sign -- so Hind Siliguri sits
// behind it in the stack and picks up every Bengali glyph. Latin never
// reaches Hind Siliguri because Outfit already has those glyphs, so the type
// scale is unchanged for existing screens.
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-700.css";
import "@fontsource/hind-siliguri/bengali-400.css";
import "@fontsource/hind-siliguri/bengali-500.css";
import "@fontsource/hind-siliguri/bengali-600.css";
import "@fontsource/hind-siliguri/bengali-700.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
