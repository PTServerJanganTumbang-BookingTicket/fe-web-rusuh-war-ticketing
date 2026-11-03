import { cn } from "../cn.utils";

/**
 * Sampul event dekoratif. Gambar dilapis di atas gradien merek, jadi URL yang gagal dimuat tetap menampilkan
 * gradien, bukan ikon gambar rusak. Dekoratif: nama event selalu ada sebagai teks di sebelahnya.
 */
export function EventCover({ src, className }: { src: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative w-full bg-gradient-to-br from-brand-dark via-brand-dark to-brand", className)}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
      />
    </div>
  );
}
