---
name: new-feature-screen
description: Membuat layar baru di sebuah modul (src/modules/<m>) dengan pola use case + ViewModel hook + Container + View props-only, lengkap dengan test dan story. Gunakan saat menambah halaman atau layar state (mis. sesi berakhir, pembayaran pending).
---

# New Feature Screen

Baca dulu `docs/ai/steering/architecture-rules.md`, ADR-0003, ADR-0014, dan ADR-0015. Bila layar milik bounded context yang belum ada, jalankan skill [`new-module`](../new-module/SKILL.md) dulu.

## Langkah

1. **Identifikasi requirement dan wireframe.** Catat ID FR/NFR/BR dan nomor wireframe yang dipenuhi layar ini di komentar kepala file ViewModel. Wireframe dipakai untuk struktur dan isi, bukan visual.
2. **Aturan bisnis ke `domain` dulu.** Jika layar butuh aturan baru (validasi, transisi state, perhitungan), tambahkan sebagai fungsi murni di `src/modules/<m>/domain/` (atau `src/core/domain` bila dipakai lintas modul) beserta test Vitest. Jangan lanjut sebelum test hijau.
3. **Port dan use case di `application`.** Jika butuh data atau aksi baru: tambah method di port (`<Nama>Repository.ts`) atau port baru yang kecil (ISP), lalu use case `<KataKerja><Benda>.ts` (kelas, `constructor({ deps })`, `execute`). Tambah ke `dependencies.ts`. Test use case dengan fake port.
4. **Adapter di `infrastructure`.** Pastikan endpoint sudah ada di OpenAPI (skill `sync-api-contract`), lalu implementasikan port di `Http<Nama>Repository.ts` dengan schema zod lewat `HttpClient`. Tambah kasus di `src/test/httpRepositories.test.ts` dan handler di `src/mocks/handlers.ts`.
5. **Registrasi.** Daftarkan port dan use case baru di `src/modules/<m>/<m>.module.ts` (`asClass(...).singleton()`) dan tipe `<M>Cradle`. `src/di/container.test.ts` harus tetap hijau.
6. **Query options.** Di `presentation/<m>Queries.ts`: query key diawali nama modul, `queryFn` memanggil use case, jitter memakai `random` dari container (ADR-0004).
7. **View.** Buat `presentation/views/<Screen>View.tsx` lewat skill `new-ui-component`. Semua state visual (loading, kosong, error per `AppError`, expired) punya story.
8. **Mapper.** `presentation/to<Screen>ViewProps.ts`: fungsi murni dari data domain ke props View (format angka dan tanggal, label i18n, state tombol), dengan test tanpa render.
9. **ViewModel.** `presentation/use<Screen>ViewModel.ts`:
   - Ambil dependensi dengan `useCradle<<M>Dependencies & CoreDependencies>()` (destructuring).
   - Mengembalikan objek datar atau union layar: state siap tampil + command.
   - Tidak mengandung aturan bisnis; memanggil fungsi `domain` dan use case.
   - Memetakan `AppError` ke key i18n. Konfigurasi dari `appConfig`, bukan `process.env`.
10. **Container.** `<Screen>Container.tsx` hanya: `const vm = use<Screen>ViewModel(...); return <<Screen>View {...vm} />`.
11. **Route.** `src/app/.../page.tsx` hanya merender Container. Halaman yang membaca `params` membungkusnya dalam `<Suspense>`, dan `layout.tsx` route memasang `<Suspense>` + `AppProviders` dari `@/di/AppProviders` (bukan di root layout). Server Component statis memanggil loader presentation dengan `getServerCradle()` (lihat Home). Tentukan strategi rendering sesuai ADR-0007. Jika route perlu dijaga token, tambahkan matcher di `src/proxy.ts`.
12. **Test ViewModel** dengan Testing Library, `setupMockServer`, dan `createWrapper` dari `@/test/support`. Untuk variasi konfigurasi atau dependensi, `setupTestContainer(overrides, config)`.
13. **i18n.** Semua string lewat key di `src/ui/i18n/id.ts`.

## Checklist sebelum selesai

- [ ] Tidak ada import yang melanggar aturan dependensi (`pnpm lint` hijau): presentation hanya `import type` dari `application`, tidak ada impor lintas modul.
- [ ] Tidak ada class ViewModel, Provider baru, atau server state di Context. Kelas hanya untuk use case dan adapter.
- [ ] Countdown (jika ada) memakai `useCountdown` dari `expiresAt`.
- [ ] Setiap error code yang relevan punya tampilan.
- [ ] Test mapper dan ViewModel ditambahkan. Story ditambahkan setelah Storybook terpasang.
- [ ] `pnpm check` hijau. Kontrol khusus simulasi hanya muncul di mode mock.
