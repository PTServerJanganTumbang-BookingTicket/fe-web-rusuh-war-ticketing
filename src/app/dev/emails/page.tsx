// Galeri pratinjau template email untuk review desain. Hanya aktif di development; di build produksi route ini 404.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { listPreviews } from "../../../../emails/preview.mjs";

export const metadata = { title: "Pratinjau email", robots: { index: false } };

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="type-h3 text-foreground">Pratinjau template email</h1>
      <p className="type-body1 mt-2 mb-8 max-w-2xl text-muted-foreground">
        Sumber di <code>emails/*.mjml</code> dan diisi data contoh. Gambar contoh ada di{" "}
        <code>public/images/email</code>; di produksi <code>logoUrl</code> dan <code>appUrl</code> menunjuk ke
        host publik.
      </p>
      <Suspense fallback={<p role="status">Memuat template…</p>}>
        <PreviewGrid />
      </Suspense>
    </main>
  );
}

// Kompilasi MJML membaca berkas saat request, jadi dibungkus Suspense (Cache Components).
async function PreviewGrid() {
  const previews = await listPreviews();

  return (
    <>
      <div className="flex flex-col gap-16">
        {previews.map(({ name, subject }) => (
          <section key={name} aria-labelledby={`subject-${name}`}>
            <header className="border-b border-border pb-6">
              <p className="type-body2 font-semibold tracking-wide text-primary uppercase">Subjek · {name}</p>
              <h2 id={`subject-${name}`} className="type-h4 mt-3 text-foreground">
                {subject}
              </h2>
              <p className="type-body2 mt-2 flex flex-wrap items-center gap-x-3 text-muted-foreground">
                <span>Dari: Rusuh Booking Tiket · pengirim diatur saat implementasi</span>
                <a
                  href={`/dev/emails/${name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Buka penuh
                </a>
              </p>
            </header>
            <iframe
              title={`Pratinjau email ${name}`}
              src={`/dev/emails/${name}`}
              className={`mx-auto mt-8 ${name === "ticket-issued" ? "h-[1500px]" : "h-[1000px]"} w-full max-w-[640px] rounded-2xl border-0`}
            />
          </section>
        ))}
      </div>
    </>
  );
}
