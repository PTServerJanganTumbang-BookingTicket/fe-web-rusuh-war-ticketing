// Pratinjau satu template email sebagai dokumen HTML utuh (dipakai iframe di /dev/emails). Hanya aktif di development (NODE_ENV).
import { notFound } from "next/navigation";
import { renderPreview } from "../../../../../emails/preview.mjs";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { name } = await params;
  const preview = await renderPreview(name);
  if (!preview) notFound();
  return new Response(preview.html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
