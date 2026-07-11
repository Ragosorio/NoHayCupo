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
  },
});
