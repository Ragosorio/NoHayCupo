/** Tests de la revalidación de grupos del lado navegador (grupos.ts): la app
 * NUNCA debe mostrar un link que no sea un grupo de WhatsApp/Telegram limpio,
 * aunque el JSON traiga basura. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { E } from "@/lib/cliente/estado";
import {
  grupoDeSeccion, linkTelegramValido, linkWhatsappValido,
} from "@/lib/cliente/grupos";

vi.stubGlobal("localStorage", {
  getItem: () => null, setItem: () => {}, removeItem: () => {},
});

beforeEach(() => { E.semestre = "2"; });

describe("validación de links", () => {
  it("acepta solo el link canónico de WhatsApp", () => {
    expect(linkWhatsappValido("https://chat.whatsapp.com/Bz9ecHEQYUyDR2JJOjXnas")).toBe(true);
    expect(linkWhatsappValido("https://chat.whatsapp.com/Bz9?s=cl")).toBe(false); // con query
    expect(linkWhatsappValido("http://chat.whatsapp.com/Bz9ecHEQYUyDR2JJOjXnas")).toBe(false); // http
    expect(linkWhatsappValido("https://tiktok.com/@x")).toBe(false);
    expect(linkWhatsappValido(42)).toBe(false);
  });
  it("acepta solo el link canónico de Telegram", () => {
    expect(linkTelegramValido("https://t.me/+AbCdEfGh12")).toBe(true);
    expect(linkTelegramValido("https://t.me/joinchat/AbCdEfGh12")).toBe(true);
    expect(linkTelegramValido("https://t.me/micanal")).toBe(true);
    expect(linkTelegramValido("https://telegram.org/x")).toBe(false);
  });
});

describe("grupoDeSeccion", () => {
  it("devuelve el grupo real de una sección conocida (semilla 0768 A)", () => {
    const g = grupoDeSeccion("0768", "A");
    expect(g?.whatsapp).toContain("chat.whatsapp.com");
  });
  it("no devuelve nada para un curso/sección sin grupo", () => {
    expect(grupoDeSeccion("9999", "Z")).toBeNull();
    expect(grupoDeSeccion("0768", "Z")).toBeNull();
  });
  it("no muestra grupos si el periodo activo no es el del archivo", () => {
    E.semestre = "1";
    expect(grupoDeSeccion("0768", "A")).toBeNull();
  });
});
