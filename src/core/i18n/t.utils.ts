import { id, type MessageKey } from "./id.messages";

export type { MessageKey };

/** Default id-ID. Placeholder memakai `{nama}`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return id[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
