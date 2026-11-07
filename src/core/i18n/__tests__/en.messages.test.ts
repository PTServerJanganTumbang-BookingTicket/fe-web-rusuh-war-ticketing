import { describe, expect, it } from "vitest";
import { en } from "../en.messages";
import { id, type MessageKey } from "../id.messages";

const placeholdersOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Layar fokus i18n: Detail Ticket (booking dan checkout), profil, e-tiket dan Tiket saya. */
const FOCUS_PREFIXES = ["account.", "booking.", "checkout.", "ticket."];

describe("en.messages", () => {
  it("placeholder setiap terjemahan sama dengan versi Indonesia", () => {
    for (const [key, text] of Object.entries(en)) {
      expect(placeholdersOf(text), key).toEqual(placeholdersOf(id[key as MessageKey]));
    }
  });

  it("semua teks layar fokus sudah diterjemahkan", () => {
    const missing = (Object.keys(id) as MessageKey[]).filter(
      (key) => FOCUS_PREFIXES.some((prefix) => key.startsWith(prefix)) && !en[key],
    );
    expect(missing).toEqual([]);
  });
});
