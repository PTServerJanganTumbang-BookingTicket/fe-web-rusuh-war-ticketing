# Testing

| Lapisan | Tool | Wajib dites |
|---|---|---|
| `core` | Vitest | Validasi NIK, `canAddTicket` (stok, batas 3, akumulasi booking aktif), reducer booking (semua transisi), `remainingMs` (offset positif, negatif, tab tertidur) |
| `api` | Vitest + MSW | Parsing response valid dan tidak valid, pemetaan setiap error code ke `AppError`, retry dan backoff |
| `ui` | Storybook + addon a11y | Satu story per state visual. Tidak ada pelanggaran a11y level serius |
| `features` | Vitest + Testing Library + MSW | Mapper `to<Screen>ViewProps` (murni) dan alur ViewModel dengan server MSW bersama (`apps/web/features/__tests__/support.tsx`) |
| E2E | Playwright + fake clock | Happy path, booking expired, payment expired, stok habis saat submit, slot diambil alih tab lain |

## Aturan

- **Logika baru di `core` tanpa test tidak boleh di-merge.**
- **Bug fix diawali test yang gagal.**
- **Test waktu tidak pernah memakai `sleep`.** Gunakan parameter `now` di `core` dan fake clock di Playwright.
- **Skenario MSW dipakai bersama** oleh dev server, Storybook, test, dan demo. Jangan membuat mock ad hoc di dalam test.

## Status tooling (2026-10-19)

| Alat | Status |
|---|---|
| Vitest, MSW (`mocks/`) | Terpasang. Dipakai `core`, `api`, `i18n`, mapper, dan ViewModel |
| Testing Library + jsdom | Terpasang. Test ViewModel Queue, Booking, dan Payment ada |
| CI (`.github/workflows/ci.yml`) | Ada: lint, typecheck, test, build, dan cek Home statis. Belum pernah dijalankan (repo belum di git) |
| Reducer state machine booking | **Belum ada.** Status booking dan payment saat ini diturunkan dari respons server. Ditambahkan saat endpoint submit booking tersedia |
| Storybook + addon a11y | **Belum terpasang.** Skill `new-ui-component` meminta story per state visual |
| Playwright + fake clock | Terpasang (`apps/web/e2e`, `pnpm test:e2e`). Tiga dari lima skenario E2E utama ada: happy path, booking expired, payment expired. "Stok habis saat submit" dan "slot diambil alih" ditandai `test.fixme` sampai fiturnya dibangun |

Aturan menulis test ViewModel: unik `eventId` atau `orderId` per test (state mock tersimpan per id), override respons lewat `server.use`, dan `next/navigation` di-mock.

## E2E (Playwright)

- Menjalankan: `pnpm test:e2e` (server dev dengan mock MSW dijalankan otomatis atau dipakai ulang bila sudah jalan di port 3000). Lokal memakai Chrome yang terpasang; CI memasang Chromium.
- Proyek utama adalah viewport mobile (Pixel 7), karena payment page dipakai ulang di WebView.
- **Jam palsu**: `page.clock.install()` lalu `page.clock.runFor(...)`. Waktu nyata tetap berjalan di bawah jam palsu, jadi nilai countdown awal dicek rentangnya, bukan angka pasti. Dilarang `waitForTimeout` sebagai pengganti menunggu kondisi.
- Skenario mock dipilih lewat `?scenario=` di URL Waiting Room (`booking-expiring`, `payment-expiring`). Setiap tes mendapat worker MSW baru, jadi state mock tidak bocor antar tes.
- Selektor memakai peran dan nama aksesibel (`getByRole`), sehingga tes juga memeriksa aksesibilitas dasar.
