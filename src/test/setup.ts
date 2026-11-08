import { afterEach } from "vitest";

// Vitest tanpa `globals` tidak memicu auto-cleanup Testing Library. Tanpa unmount, jadwal React (scheduler)
// masih berjalan setelah environment jsdom dibongkar dan melempar "window is not defined".
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
