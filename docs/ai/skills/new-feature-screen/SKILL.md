---
name: new-feature-screen
description: Membuat layar baru di sebuah modul (src/modules/<m>) dengan pola use case + hook controller + Container + View props-only, lengkap dengan test dan story. Gunakan saat menambah halaman atau layar state (mis. sesi berakhir, pembayaran pending).
---

# New Feature Screen

Baca dulu `docs/ai/steering/architecture-rules.md`, ADR-0003, ADR-0014, dan ADR-0015. Bila layar milik bounded context yang belum ada, jalankan skill [`new-module`](../new-module/SKILL.md) dulu.

## Langkah

1. **Identifikasi requirement dan wireframe.** Catat ID FR/NFR/BR dan nomor wireframe yang dipenuhi layar ini di komentar kepala file controller. Wireframe dipakai untuk struktur dan isi, bukan visual.
2. **Aturan bisnis ke `domain` dulu.** Jika layar butuh aturan baru (validasi, transisi state, perhitungan), tambahkan di `src/modules/<m>/domain/<konsep>.rules.ts` atau `<konsep>.reducer.ts` (atau `src/core/domain` bila dipakai lintas modul) beserta test Vitest di sebelahnya. Angka bisnis baru masuk `<m>.constants.ts`. Jangan lanjut sebelum test hijau.
3. **Protocol dan use case.** Jika butuh data atau aksi baru: tambah method di protocol (`domain/<nama>.protocol.ts`) atau protocol baru yang kecil (ISP), lalu use case `application/<kata-kerja>-<benda>.use-case.ts` (kelas `<KataKerja><Benda>UseCase`, `constructor({ deps })`, `execute`). Tambah ke `<m>.dependencies.ts`. Test use case dengan fake protocol.
4. **Service di `data`.** Pastikan endpoint sudah ada di OpenAPI (skill `sync-api-contract`), lalu tulis schema di `data/<nama>.schema.ts` (`satisfies z.ZodType<Model>`) dan implementasikan protocol di `data/http-<nama>.service.ts` lewat `HttpClient`. Tambah kasus di `src/test/http-services.test.ts` dan handler di `src/mocks/handlers.ts`.
5. **Registrasi.** Daftarkan service (`<x>Service`) dan use case (`<x>UseCase`) di `src/modules/<m>/<m>.module.ts` (`asClass(...).singleton()`) dan tipe `<M>Registry`. `src/di/container.test.ts` harus tetap hijau.
6. **Query options.** Di `controllers/<m>.queries.ts`: query key diawali nama modul, `queryFn` memanggil use case, jitter memakai `random` dari container, interval dari `<m>.constants.ts` (ADR-0004).
7. **View.** Buat `views/<Layar>View.tsx` lewat skill `new-ui-component`. Semua state visual (loading, kosong, error per `AppError`, expired) punya story.
8. **Mapper.** `controllers/<m>.mapper.ts` (`to<Layar>ViewProps`): fungsi murni dari data domain ke props View (format angka dan tanggal, label i18n, state tombol), dengan test tanpa render di `<m>.mapper.test.ts`.
9. **Controller.** `controllers/<m>.controller.ts` (`use<Layar>Controller`):
   - Ambil dependensi dengan `useDependencies<<M>Dependencies & CoreDependencies>()` (destructuring).
   - Mengembalikan objek datar atau union layar: state siap tampil + command.
   - Tidak mengandung aturan bisnis; memanggil fungsi `domain` dan use case.
   - Memetakan `AppError` ke key i18n. Konfigurasi dari `appConfig`, bukan `process.env`.
10. **Container.** `views/<Layar>Container.tsx` hanya: `const screen = use<Layar>Controller(...); return <<Layar>View {...screen} />`.
11. **Route.** `src/app/.../page.tsx` hanya merender Container. Halaman yang membaca `params` membungkusnya dalam `<Suspense>`, dan `layout.tsx` route memasang `<Suspense>` + `AppProviders` dari `@/di/AppProviders` (bukan di root layout). Server Component statis memanggil loader (`controllers/<layar>.loader.ts`) dengan `getServerDependencies()` (lihat Home). Tentukan strategi rendering sesuai ADR-0007. Jika route perlu dijaga token, tambahkan matcher di `src/proxy.ts`.
12. **Test controller** di `controllers/<m>.controller.test.tsx` dengan Testing Library, `setupMockServer`, dan `createWrapper` dari `@/test/support`. Untuk variasi konfigurasi atau dependensi, `setupTestContainer(overrides, config)`.
13. **i18n.** Semua string lewat key di `src/core/i18n/id.messages.ts`.

## Checklist sebelum selesai

- [ ] Tidak ada import yang melanggar aturan dependensi (`npm run lint` hijau): controller hanya `import type` dari `application`, view tidak mengimpor controller, tidak ada impor lintas modul.
- [ ] Tidak ada class controller, Provider baru, atau server state di Context. Kelas hanya untuk use case, service, dan client.
- [ ] Countdown (jika ada) memakai `useCountdown` dari `expiresAt`.
- [ ] Setiap error code yang relevan punya tampilan.
- [ ] Tidak ada angka bisnis langsung di controller, mapper, atau query.
- [ ] Test mapper dan controller ditambahkan. Story ditambahkan setelah Storybook terpasang.
- [ ] `npm run check` hijau. Kontrol khusus simulasi hanya muncul di mode mock.
