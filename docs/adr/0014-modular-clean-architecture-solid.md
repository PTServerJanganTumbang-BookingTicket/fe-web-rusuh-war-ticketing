# ADR-0014: Clean Architecture per modul dan aturan SOLID

- **Status**: Proposed
- **Tanggal**: 2026-10-28
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-13–19, NFR-02, NFR-04, NFR-07
- **Menggantikan**: [ADR-0002](0002-layered-clean-architecture.md)

## Konteks

ADR-0002 menetapkan aturan dependensi satu arah `app → features → ui, api, i18n → core`. Dengan struktur modul ([ADR-0013](0013-single-app-modular-structure.md)), aturan itu perlu dirumuskan ulang. Selain itu ada celah yang membuat arsitekturnya belum "bersih":

- **Tidak ada lapisan use case.** ViewModel memanggil fungsi adapter HTTP (`listEvents`, `startPayment`) secara langsung, jadi presentation bergantung pada implementasi, bukan abstraksi (DIP dilanggar).
- **Tidak ada port.** Mengganti transport (mis. BFF, GraphQL, cache offline) berarti mengubah ViewModel.
- **Dependensi tersembunyi.** `Date.now()`, `Math.random()`, dan `process.env` dibaca di ViewModel, query options, dan adapter, sehingga test harus memalsukan global.
- **Port pembayaran gemuk.** Endpoint simulasi (khusus mock) berdampingan dengan endpoint asli dalam satu adapter.

## Opsi yang dipertimbangkan

1. **Pertahankan ADR-0002, hanya pindahkan folder.** Murah, tetapi celah di atas tetap ada.
2. **Clean Architecture penuh per modul** (dipilih): domain, application (use case + port), infrastructure (adapter), presentation, dengan DI di composition root.
3. **Hexagonal tanpa use case** (port langsung dipakai presentation). Lebih sedikit kelas, tetapi tidak ada tempat untuk orkestrasi lintas port saat aplikasi berkembang (mis. submit booking yang memeriksa kuota, membuat order, lalu memulai pembayaran).

## Keputusan

Opsi 2.

### Lapisan dalam setiap modul (`src/modules/<m>`) dan kode bersama

Kode bersama dipisah menurut lapisannya, sehingga nama folder menyatakan isinya:

| Folder | Setara lapisan | Isi |
|---|---|---|
| `src/core` | `domain` + `application` bersama | `AppError`, waktu, `AppConfig`, `Clock`, `RandomSource`, port sesi, `LiveUpdates`. Murni, boleh dipakai semua lapisan |
| `src/platform` | `infrastructure` bersama | `HttpClient`, klien SSE, gateway dan cookie sesi, `SystemClock`, `MathRandomSource` |
| `src/ui` | `presentation` bersama | `design-system/` (Signal), `i18n/`, `hooks/`, `di/` (`useCradle`) |


| Lapisan | Isi | Boleh bergantung pada | Dilarang |
|---|---|---|---|
| `domain` | Tipe entitas, value object, aturan murni (`canAddTicket`, `selectionReducer`, `queueProgressPercent`) | `domain` modul sendiri, `core/domain` | Framework, `zod`, `awilix`, I/O, `Date.now()` |
| `application` | Use case (kelas `execute()`), port (interface repository/gateway), `dependencies.ts` (irisan container untuk presentation) | `domain` + `application` modul sendiri, `core` | Framework, `zod`, `awilix`, `fetch`, `Date.now()`, `Math.random()` |
| `infrastructure` | Adapter yang mengimplementasikan port (`HttpEventRepository`), schema zod | `domain`, `application`, `infrastructure` modul sendiri, `core`, `platform` | React, Next, `awilix` |
| `presentation` | ViewModel hook, mapper `to<Screen>ViewProps`, Container, query options | `domain` + `presentation` + `views` modul sendiri, `core/domain`, `ui`; **`application` hanya `import type`** | Impor nilai dari `application`/`infrastructure`, `awilix`, `Date.now()`, `Math.random()` |
| `presentation/views` | View props-only | `ui/design-system`, view modul sendiri; `domain` hanya tipe | Hook data, i18n, apa pun selain design system |
| `<m>.module.ts` | Registrasi DI modul | Semua lapisan modul sendiri, `core`, `platform` | Modul lain |

Lapisan terluar: `src/di` (composition root) boleh mengimpor registrasi modul, `core`, `platform`, dan `ui`; `src/app`, `proxy.ts`, `instrumentation.ts` (framework) boleh mengimpor `di`, presentation, dan `platform` (konstanta cookie).

**Modul tidak saling mengimpor.** Yang dipakai lebih dari satu modul pindah ke `src/core` (domain dan application murni), `src/platform` (adapter bersama), atau `src/ui` (presentation bersama dan design system). Contoh: sesi/access token (`StartSession`, `SessionGateway`) dipakai Waiting Room dan nanti login, jadi ada di `core/application/session`.

### Aturan SOLID yang ditegakkan

- **SRP**: satu use case satu kelas dengan satu `execute()`. Satu adapter per port. Mapper murni terpisah dari ViewModel.
- **OCP**: modul baru ditambahkan dengan folder baru dan satu baris di `src/di/container.ts`; modul lain tidak diubah.
- **LSP**: implementasi port (HTTP, fake di test, kelak cache/offline) bisa saling ganti; test application memakai fake yang memenuhi port yang sama.
- **ISP**: port kecil dan spesifik (`OrderRepository` terpisah dari `PaymentSimulator` yang hanya ada di mode mock). Presentation meminta irisan container yang ia butuhkan (`PaymentDependencies & CoreDependencies`), bukan seluruh container.
- **DIP**: use case bergantung pada port. Presentation hanya mengenal tipe use case dan menerima instance dari container ([ADR-0015](0015-dependency-injection-awilix.md)). Jam, acak, dan konfigurasi adalah port/nilai yang diinjeksikan (`Clock`, `RandomSource`, `AppConfig`).

### Yang tetap dari ADR-0002

- FE tidak pernah memanggil Midtrans. Pembayaran lewat endpoint BE (ADR-0006).
- Error dimodelkan sebagai `AppError` di `core/domain/errors`. Infrastructure memetakan HTTP ke `AppFailure`, presentation memetakan `AppError` ke key i18n.

### Konvensi tipe use case

Use case adalah kelas; presentation mengimpor kelasnya **sebagai tipe saja**. TypeScript bertipe struktural, jadi implementasi apa pun dengan bentuk yang sama bisa diregistrasikan. Interface terpisah (`IListEvents`) tidak dibuat karena hanya menambah duplikasi. Port (repository, gateway) tetap interface eksplisit karena memang punya lebih dari satu implementasi.

## Konsekuensi

- **Positif**: use case dan port dites dengan fake biasa tanpa MSW maupun memock modul. Mengganti transport atau menambah cache tidak menyentuh presentation. Dependensi tersembunyi (jam, acak, env) hilang dari presentation dan application. Pelanggaran lapisan dan lintas modul gagal di lint.
- **Negatif**: lebih banyak file per fitur (port, use case, adapter, registrasi). Use case yang hanya meneruskan ke repository terlihat seremonial di awal; nilainya muncul saat orkestrasi bertambah (submit booking, `SESSION_REVOKED` global).
- **Yang harus dijaga**: `eslint.boundaries.mjs` dengan `default: "disallow"`; aturan diverifikasi dengan file probe yang melanggar (domain → infrastructure, presentation → application nilai, lintas modul, `awilix` di application, `Math.random` di application). Coverage 85% untuk `domain`, `application`, `infrastructure`, dan `di`.
