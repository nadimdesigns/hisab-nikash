import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Fonts are self-hosted rather than pulled from Google Fonts: the app must
// render on a dead connection (see the service worker), and a blocking
// stylesheet request in <head> is the one thing that would stop it.
//
// Anek Bangla is the sole app-wide font family across all scripts and weights.
import "@fontsource/anek-bangla/400.css";
import "@fontsource/anek-bangla/500.css";
import "@fontsource/anek-bangla/600.css";
import "@fontsource/anek-bangla/700.css";
import "@fontsource/anek-bangla/800.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
