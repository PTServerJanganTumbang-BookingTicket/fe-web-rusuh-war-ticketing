import { id, type MessageKey } from "./id";

/** Default id-ID. Placeholder memakai `{nama}`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return id[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
