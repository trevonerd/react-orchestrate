import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChoreographyDemo } from "./demo/ChoreographyDemo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChoreographyDemo />
  </StrictMode>,
);
