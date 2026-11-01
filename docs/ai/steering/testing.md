# Testing

| Lapisan | Tool | Wajib dites |
|---|---|---|
| `domain` (modul dan `core`) | Vitest | Validasi NIK, `canAddTicket` (stok, batas 3, akumulasi booking aktif), reducer booking (semua transisi), `remainingMs` (offset positif, negatif, tab tertidur) |
| `application` | Vitest + fake | Setiap use case dengan fake yang memenuhi protocol (tanpa MSW, tanpa `vi.mock`); argumen yang diteruskan ke protocol diperiksa |
| `data` | Vitest + MSW | Parsing response valid dan tidak valid, pemetaan setiap error code ke `AppError`, retry dan backoff. Service di-resolve dari container uji (`src/test/http-services.test.ts`) |
| `di` | Vitest | Setiap registrasi bisa di-resolve dalam mode strict (`src/di/container.test.ts`) |
| `core/views/design-system`, `modules/<m>/views` | Storybook + addon a11y | Satu story per state visual. Tidak ada pelanggaran a11y level serius |
| `controllers` | Vitest + Testing Library + MSW | Mapper `to<Layar>ViewProps` (murni) dan alur controller dengan server MSW dan container uji bersama (`src/test/support.tsx`: `setupMockServer`, `setupTestContainer`, `createWrapper`) |
| E2E | Playwright + fake clock | Happy path, booking expired, payment expired, stok habis saat submit, slot diambil alih tab lain |

## Aturan

- **Test di sebelah file yang dites**, dengan nama `<file>.test.ts(x)` (`payment.mapper.test.ts`, `get-queue-state.use-case.test.ts`). Tidak ada folder `__tests__`. Test lintas modul (service HTTP terhadap MSW) ada di `src/test`.

- **Selektor memakai `getByRole` / `getByText`**, `getByTestId` hanya bila tidak ada peran atau teks yang bermakna.
- **Uji jalur sukses dan galat.** Untuk `data` dan controller, periksa path dan payload request yang diterima handler MSW, bukan memock modul HTTP.
- **Mock direset tiap test** (`vi.clearAllMocks()` di `beforeEach` bila memakai `vi.fn`).
- **Event handler diperiksa argumennya**, bukan hanya dipanggil.
- **Coverage minimum 85%** (statement, branch, function, line) untuk `domain`, `application`, `data` (modul dan `core`) dan `src/di`, ditegakkan `npm run test:coverage` dan CI. Controller dan view tidak dihitung; keduanya diuji lewat test mapper/controller, story, dan e2e.
- **Logika baru di `domain` atau use case baru tanpa test tidak boleh di-merge.**
- **Bug fix diawali test yang gagal.**
- **Test waktu tidak pernah memakai `sleep`.** Gunakan parameter `now` di `domain`, override `clock` di container uji, dan fake clock di Playwright.
- **Skenario MSW dipakai bersama** oleh dev server, Storybook, test, dan demo. Jangan membuat mock ad hoc di dalam test.

## Status tooling (2026-10-19)

| Alat | Status |
|---|---|
| Vitest, MSW (`src/mocks/`) | Terpasang. Dipakai domain, application, data, di, i18n, mapper, dan controller |
| Testing Library + jsdom | Terpasang. Test controller Queue, Booking, dan Payment ada |
| CI (`.github/workflows/ci.yml`) | Ada: lint, typecheck, test dengan coverage, build, dan cek Home statis. Belum pernah dijalankan (repo belum di git) |
| Reducer state machine booking | **Belum ada.** Status booking dan payment saat ini diturunkan dari respons server. Ditambahkan saat endpoint submit booking tersedia |
| Storybook + addon a11y | **Belum terpasang.** Skill `new-ui-component` meminta story per state visual |
| Playwright + fake clock | Terpasang (`e2e/`, `npm run test:e2e`). Tiga dari lima skenario E2E utama ada: happy path, booking expired, payment expired. "Stok habis saat submit" dan "slot diambil alih" ditandai `test.fixme` sampai fiturnya dibangun |

Aturan menulis test controller: unik `eventId` atau `orderId` per test (state mock tersimpan per id), override respons lewat `server.use`, dan `next/navigation` di-mock. Stream SSE dites dengan `FakeEventSource` (`src/test/fake-event-source.ts`): `setupFakeEventSources()`, override `eventSourceFactory`, lalu `emit("open")` dan `emit("<event>", data)`. Container uji default memakai fake yang tidak pernah tersambung, jadi controller memakai polling cadangan. Untuk mengganti konfigurasi atau satu dependensi, buat container dengan `setupTestContainer(overrides, config)` lalu `createWrapper(container)`; jangan `vi.mock` modul aplikasi atau `vi.stubGlobal("fetch")`.

## E2E (Playwright)

- Menjalankan: `npm run test:e2e` (server dev dengan mock MSW dijalankan otomatis atau dipakai ulang bila sudah jalan di port 3000). Lokal memakai Chrome yang terpasang; CI memasang Chromium.
- Proyek utama adalah viewport mobile (Pixel 7), karena payment page dipakai ulang di WebView.
- **Jam palsu**: `page.clock.install()` lalu `page.clock.runFor(...)`. Waktu nyata tetap berjalan di bawah jam palsu, jadi nilai countdown awal dicek rentangnya, bukan angka pasti. Dilarang `waitForTimeout` sebagai pengganti menunggu kondisi.
- Skenario mock dipilih lewat `?scenario=` di URL Waiting Room (`booking-expiring`, `payment-expiring`). Setiap tes mendapat worker MSW baru, jadi state mock tidak bocor antar tes.
- Selektor memakai peran dan nama aksesibel (`getByRole`), sehingga tes juga memeriksa aksesibilitas dasar.
