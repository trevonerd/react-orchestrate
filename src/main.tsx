import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PerfectDemo } from "./demo/PerfectDemo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PerfectDemo />
  </StrictMode>,
);
