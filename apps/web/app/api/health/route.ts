import { connection } from "next/server";

// Probe liveness/readiness container (ADR-0013). Tidak memanggil BE: proses Next yang hidup dianggap sehat,
// supaya gangguan BE tidak membuat orkestrator membunuh container yang masih bisa melayani Home dari cache.
export async function GET() {
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
