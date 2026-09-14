import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "sonner/dist/styles.css";
import { createRoot } from "react-dom/client";
import { DesktopApp } from "./app/desktop";
import "./styles/desktop.css";
import "./styles/globals.css";
createRoot(document.getElementById("root")!).render(<DesktopApp />);
