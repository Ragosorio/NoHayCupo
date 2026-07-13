// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// Salida "server" porque los endpoints /api/* scrapean bajo demanda; la página
// principal igual se prerenderiza (export const prerender = true en index).
export default defineConfig({
  site: "https://nohaycupo.vercel.app",
  output: "server",
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // web-llm se importa dinámico (solo al despertar a Cupito): sin esto,
    // Vite lo descubre a media sesión, re-optimiza deps y el primer intento
    // muere con 504 «Outdated Optimize Dep» → "Importing a module script
    // failed". Pre-incluirlo lo deja optimizado desde el arranque del dev.
    optimizeDeps: { include: ["@mlc-ai/web-llm"] },
  },
});
