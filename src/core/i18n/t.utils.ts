import { en } from "./en.messages";
import { id, type MessageKey } from "./id.messages";
import { getLocale, type Locale } from "./locale.utils";

export type { MessageKey };

const MESSAGES: Record<Locale, Partial<Record<MessageKey, string>>> = { id, en };

/** Teks untuk bahasa aktif (`locale.utils.ts`); key yang belum diterjemahkan memakai id-ID. Placeholder `{nama}`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = MESSAGES[getLocale()][key] ?? id[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
