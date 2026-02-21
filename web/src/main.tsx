import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { BrowsePage } from "@/pages/BrowsePage";
import { AgentDetailPage } from "@/pages/AgentDetailPage";
import { OrderPage } from "@/pages/OrderPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<BrowsePage />} />
          <Route path="agents/:agentId" element={<AgentDetailPage />} />
          <Route path="agents/:agentId/order" element={<OrderPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
