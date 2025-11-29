import { Temporal } from "temporal-polyfill";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./css/index.css";

(globalThis as any).Temporal = Temporal;

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

// Remove StrictMode for react-beautiful-dnd
root.render(<App />);
