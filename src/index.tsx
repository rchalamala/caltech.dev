import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./css/index.css";

const rootElement = document.querySelector("#root");

if (rootElement === null) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
