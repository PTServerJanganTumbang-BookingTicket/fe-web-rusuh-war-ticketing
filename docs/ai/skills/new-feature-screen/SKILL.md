---
name: new-feature-screen
description: Membuat layar baru di apps/web dengan pola ViewModel hook + Container + View props-only, lengkap dengan test dan story. Gunakan saat menambah halaman atau layar state (mis. sesi berakhir, pembayaran pending).
---

# New Feature Screen

Baca dulu `docs/ai/steering/architecture-rules.md` dan ADR-0003.

## Langkah

1. **Identifikasi requirement dan wireframe.** Catat ID FR/NFR/BR dan nomor wireframe yang dipenuhi layar ini di komentar kepala file ViewModel. Wireframe dipakai untuk struktur dan isi, bukan visual.
2. **Aturan bisnis ke `core` dulu.** Jika layar butuh aturan baru (validasi, transisi state, perhitungan), tambahkan sebagai fungsi murni di `packages/core/<domain>/` beserta test Vitest. Jangan lanjut sebelum test hijau.
   - **Ada command (tulis ke BE) yang punya aturan atau merangkai langkah?** Buat use case di `packages/core/src/application/<useCase>.ts` (ADR-0015): fungsi dengan `deps` berisi port (tipe fungsi di `ports.ts`), tes dengan port palsu, ekspor lewat `application/index.ts`, lalu sambungkan adapter-nya di `apps/web/features/shared/composition.ts`. Query (baca) tidak butuh use case.
3. **Endpoint ke `api`.** Jika butuh data baru, pastikan sudah ada di OpenAPI (skill `sync-api-contract`), lalu tambah di `packages/api`: schema DTO di `contracts/<resource>.ts` (tandai `KONTRAK-ASUMSI` bila belum final), mapper DTO → domain di `mappers/<resource>.ts`, adapter di `adapters/<resource>.ts`, query key, dan query options. Setiap adapter dan mapper punya test sendiri. Hook `useQuery`/`useMutation` dipanggil dari ViewModel di `features` (ADR-0004, ADR-0017).
4. **View di `ui`.** Buat `<Screen>View.tsx` lewat skill `new-ui-component`. Semua state visual (loading, kosong, error per `AppError`, expired) punya story.
5. **Screen model.** Buat `apps/web/features/<feature>/<screen>Model.ts`: `type <Screen>ScreenState` (union semua kondisi layar, berisi data domain, tanpa teks) dan fungsi murni `derive<Screen>ScreenState(input)`, dengan test tanpa render (ADR-0017).
6. **Mapper.** Buat `apps/web/features/<feature>/to<Screen>ViewProps.ts`: fungsi murni `({ state, actions })` → props View (format angka dan tanggal, label i18n, pemetaan `AppError` ke pesan, state tombol), dengan test tanpa render.
7. **ViewModel.** Buat `apps/web/features/<feature>/use<Screen>ViewModel.ts`:
   - Hanya hook (query, mutation, countdown, router); mengembalikan `export type <Screen>ViewModel = { state, actions }` dengan `state` dari `derive<Screen>ScreenState`.
   - Tidak mengandung aturan bisnis; memanggil fungsi `core` dan command lewat `application` (`shared/composition.ts`). Tidak mengimpor adapter command dari `@rusuh/api` langsung (ESLint).
   - Tidak mengimpor `@rusuh/i18n` (ESLint): teks dan pemetaan `AppError` ada di mapper.
8. **Container.** `<Screen>Container.tsx` hanya: `return <<Screen>View {...to<Screen>ViewProps(use<Screen>ViewModel(...))} />`, atau memilih View sesuai `kind` hasil mapper.
9. **Route.** `app/(site)/.../page.tsx` hanya merender Container; grup `(site)` memberi navbar dan footer, route embed WebView di luarnya (ADR-0008). Halaman yang membaca `params` atau `searchParams` membungkusnya dalam `<Suspense>`, dan `layout.tsx` route memasang `<Suspense>` + `AppProviders` (bukan di root layout). Tentukan strategi rendering sesuai ADR-0007. Jika route perlu dijaga token, tambahkan matcher di `proxy.ts` (Next 16 mengganti nama `middleware.ts`).
10. **Test** satu file per file sumber di `__tests__/` folder yang diuji: `<screen>Model.test.ts`, `to<Screen>ViewProps.test.ts`, `use<Screen>ViewModel.test.tsx`, dan `<useCase>.test.ts` bila ada. **Test ViewModel** dengan Testing Library dan server MSW bersama (`features/__tests__/support.tsx`), memakai skenario bernama atau `server.use`, dan memeriksa `state`, bukan teks.
11. **i18n.** Semua string lewat key di `packages/i18n`.

## Checklist sebelum selesai

- [ ] Tidak ada import yang melanggar aturan dependensi (`npm run lint` hijau).
- [ ] Tidak ada class, Provider baru, atau server state di Context.
- [ ] Countdown (jika ada) memakai `useCountdown` dari `expiresAt`.
- [ ] Setiap error code yang relevan punya tampilan.
- [ ] Test screen model, mapper, dan ViewModel ditambahkan. Story ditambahkan setelah Storybook terpasang.
- [ ] Nama dan letak file mengikuti `architecture-rules.md` "Letak dan nama file" (`fileConventions.test.ts` hijau).
- [ ] `npm run check` hijau. Kontrol khusus simulasi hanya muncul di mode mock.
