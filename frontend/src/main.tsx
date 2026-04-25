import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
