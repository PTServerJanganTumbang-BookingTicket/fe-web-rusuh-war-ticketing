---
name: new-feature-screen
description: Membuat layar baru di apps/web dengan pola ViewModel hook + Container + View props-only, lengkap dengan test dan story. Gunakan saat menambah halaman atau layar state (mis. sesi berakhir, pembayaran pending).
---

# New Feature Screen

Baca dulu `docs/ai/steering/architecture-rules.md` dan ADR-0003.

## Langkah

1. **Identifikasi requirement dan wireframe.** Catat ID FR/NFR/BR dan nomor wireframe yang dipenuhi layar ini di komentar kepala file ViewModel. Wireframe dipakai untuk struktur dan isi, bukan visual.
2. **Aturan bisnis ke `core` dulu.** Jika layar butuh aturan baru (validasi, transisi state, perhitungan), tambahkan sebagai fungsi murni di `packages/core/<domain>/` beserta test Vitest. Jangan lanjut sebelum test hijau.
3. **Endpoint ke `api`.** Jika butuh data baru, pastikan sudah ada di OpenAPI (skill `sync-api-contract`), lalu tambah adapter, schema zod, query key, dan query options di `packages/api`. Hook `useQuery`/`useMutation` dipanggil dari ViewModel di `features` (ADR-0004).
4. **View di `ui`.** Buat `<Screen>View.tsx` lewat skill `new-ui-component`. Semua state visual (loading, kosong, error per `AppError`, expired) punya story.
5. **Mapper.** Buat `apps/web/features/<feature>/to<Screen>ViewProps.ts`: fungsi murni dari data domain ke props View (format angka dan tanggal, label i18n, state tombol), dengan test tanpa render.
6. **ViewModel.** Buat `apps/web/features/<feature>/use<Screen>ViewModel.ts`:
   - Mengembalikan objek datar: state siap tampil + command.
   - Tidak mengandung aturan bisnis; memanggil fungsi `core`.
   - Memetakan `AppError` ke key i18n.
7. **Container.** `<Screen>Container.tsx` hanya: `const vm = use<Screen>ViewModel(...); return <<Screen>View {...vm} />`.
8. **Route.** `app/.../page.tsx` hanya merender Container. Halaman yang membaca `params` membungkusnya dalam `<Suspense>`, dan `layout.tsx` route memasang `<Suspense>` + `AppProviders` (bukan di root layout). Tentukan strategi rendering sesuai ADR-0007. Jika route perlu dijaga token, tambahkan matcher di `proxy.ts` (Next 16 mengganti nama `middleware.ts`).
9. **Test ViewModel** dengan Testing Library dan server MSW bersama (`features/__tests__/support.tsx`), memakai skenario bernama atau `server.use`.
10. **i18n.** Semua string lewat key di `packages/i18n`.

## Checklist sebelum selesai

- [ ] Tidak ada import yang melanggar aturan dependensi (`pnpm lint` hijau).
- [ ] Tidak ada class, Provider baru, atau server state di Context.
- [ ] Countdown (jika ada) memakai `useCountdown` dari `expiresAt`.
- [ ] Setiap error code yang relevan punya tampilan.
- [ ] Test mapper dan ViewModel ditambahkan. Story ditambahkan setelah Storybook terpasang.
- [ ] `pnpm check` hijau. Kontrol khusus simulasi hanya muncul di mode mock.
