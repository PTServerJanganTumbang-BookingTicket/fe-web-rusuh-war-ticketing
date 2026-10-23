import { cacheLife } from "next/cache";
import { listEvents } from "@rusuh/api";
import type { Event } from "@rusuh/core";

// Kondisi layar Home (ADR-0017). Home adalah Server Component statis tanpa hook ViewModel (ADR-0003, ADR-0007),
// jadi loader ini menggantikan ViewModel: data domain saja, teks dibentuk di toHomeViewProps.

export type HomeScreenState = { kind: "ready"; events: Event[] } | { kind: "failed" };

export async function loadHome(): Promise<HomeScreenState> {
  "use cache";
  // ISR pendek (ADR-0007). stale ≥ 30 dtk dan expire ≥ 5 mnt agar tetap masuk static shell.
  cacheLife({ stale: 60, revalidate: 15, expire: 600 });

  try {
    return { kind: "ready", events: await listEvents() };
  } catch {
    // Error ditangkap di dalam cache: melemparnya menggagalkan prerender build tanpa backend. ISR menyegarkannya.
    return { kind: "failed" };
  }
}
