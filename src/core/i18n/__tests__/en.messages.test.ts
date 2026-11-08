import { describe, expect, it } from "vitest";
import { en } from "../en.messages";
import { id, type MessageKey } from "../id.messages";

const placeholdersOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("en.messages", () => {
  it("placeholder setiap terjemahan sama dengan versi Indonesia", () => {
    for (const [key, text] of Object.entries(en)) {
      expect(placeholdersOf(text), key).toEqual(placeholdersOf(id[key as MessageKey]));
    }
  });

  it("semua key sudah diterjemahkan", () => {
    const missing = (Object.keys(id) as MessageKey[]).filter((key) => !en[key]);
    expect(missing).toEqual([]);
  });
});
