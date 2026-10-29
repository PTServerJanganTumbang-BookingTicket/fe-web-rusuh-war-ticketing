# ADR-0014: Clean Architecture per modul: domain, application, data, controllers, views

- **Status**: Proposed
- **Tanggal**: 2026-10-29 (revisi dari 2026-10-28)
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-13–19, NFR-02, NFR-04, NFR-07
- **Menggantikan**: [ADR-0002](0002-layered-clean-architecture.md)

## Konteks

ADR-0002 menetapkan aturan dependensi satu arah `app → features → ui, api, i18n → core`. Analisis tim (`docs/architecture/2026-10-22-layering-analysis-adr0002-vs-architecture.md` di branch `init/clean-arch`) menemukan bahwa ADR-0002 adalah aturan dependensi antar-package, bukan peta lapisan Clean Architecture:

- **Tidak ada lapisan use case.** Orkestrasi alur (mis. submit booking: cek kuota, buat order, mulai bayar) bocor ke hook ViewModel.
- **Tidak ada interface di antara use case dan HTTP.** ViewModel memanggil fungsi HTTP langsung, jadi mengganti transport (BFF, cache offline) berarti mengubah tampilan.
- **Dependensi tersembunyi.** `Date.now()`, `Math.random()`, dan `process.env` dibaca di ViewModel dan query options, sehingga test harus memalsukan global.
- **Angka bisnis tersebar.** Batas 3 tiket, interval polling, dan ambang peringatan countdown ditulis di file yang memakainya.

Versi pertama ADR ini menutup celah itu dengan lapisan `domain`, `application`, `infrastructure`, `presentation` dan istilah port/adapter. Revisi ini memakai nama dari `init/clean-arch` supaya lebih mudah dibaca, dan mengambil pola service serta konstanta terpusatnya.

## Opsi yang dipertimbangkan

1. **Pertahankan ADR-0002, hanya pindahkan folder.** Murah, tetapi celah di atas tetap ada.
2. **Lima lapisan bernama di dalam setiap modul** (dipilih): domain, application, data, controllers, views, dengan DI di composition root.
3. **Tanpa use case** (controller memakai protocol langsung). Lebih sedikit kelas, tetapi tidak ada tempat untuk orkestrasi lintas protocol saat aplikasi berkembang.

## Keputusan

Opsi 2.

### Lapisan

Arah dependensi selalu ke dalam: `views → controllers → application (tipe saja) → domain`, dan `data → application → domain`. Hanya `src/di` yang memasangkan service ke protocol.

| Lapisan | Isi | Boleh mengimpor | Dilarang |
|---|---|---|---|
| `domain/` | Model, rules, reducer, constants, protocol | `domain` modul sendiri, `core/domain` | Framework, `zod`, `awilix`, I/O, `Date.now()` |
| `application/` | Use case (kelas, satu `execute()`), `<m>.dependencies.ts` | `domain` dan `application` modul sendiri, `core/domain`, `core/application` | Framework, `zod`, `awilix`, `fetch`, `Date.now()`, `Math.random()` |
| `data/` | Service yang mengimplementasikan protocol, schema zod | `domain`, `application`, `data` modul sendiri, `core/domain`, `core/application`, `core/data` | React, Next, `awilix` |
| `controllers/` | Hook controller, mapper, query options, loader | `domain`, `controllers`, `views` modul sendiri, `core` sisi tampilan; **`application` hanya `import type`** | Impor nilai dari `application` atau `data`, `awilix`, `Date.now()`, `Math.random()` |
| `views/*Container.tsx` | Memanggil controller, memilih View | Sama dengan `controllers/` | Sama dengan `controllers/` |
| `views/` (selain Container) | View props-only | `core/views/design-system`, `views` modul sendiri; `domain` hanya tipe | Controller, i18n, hook data, apa pun selain design system |
| `<m>.module.ts` | Registrasi DI modul | `domain`, `application`, `data` modul sendiri, `core/domain`, `core/application`, `core/data` | Modul lain |

"`core` sisi tampilan" berarti `core/domain`, `core/controllers`, `core/i18n`, `core/views`. Lapisan terluar: `src/di` boleh mengimpor registrasi modul dan seluruh `core`; `src/app`, `proxy.ts`, `instrumentation.ts` boleh mengimpor `di`, controller, view, `core` sisi tampilan, dan `core/data` (konstanta cookie).

**Modul tidak saling mengimpor.** Yang dipakai lebih dari satu modul pindah ke lapisan yang sama di `src/core`. Contoh: sesi access token (`SessionProtocol`, `StartSessionUseCase`) dipakai Waiting Room dan nanti login, jadi ada di `core/domain` dan `core/application`.

### Service (diambil dari `init/clean-arch`)

- Satu protocol per sumber daya BE (`EventProtocol`, `BookingProtocol`, `OrderProtocol`, `QueueProtocol`), ditambah protocol terpisah untuk stream SSE (`QueueUpdatesProtocol`, `OrderUpdatesProtocol`) dan untuk endpoint khusus mock (`PaymentSimulatorProtocol`).
- Service memanggil `HttpClient` atau `EventStreamClient` dari `core/data` dan selalu mem-parse response dengan schema dari `<nama>.schema.ts`. Service tidak memegang URL dasar, header, atau penanganan error; itu tugas client.
- Schema ditulis `satisfies z.ZodType<Model>`, jadi perubahan model yang tidak diikuti schema gagal di `tsc`. Schema yang mengubah bentuk (mis. `retryAfterSeconds` → `retryAfterMs`) memakai `.transform()` dengan tipe hasil eksplisit.
- Kegagalan HTTP selalu dilempar client sebagai `AppFailure` berisi `AppError` (union di `core/domain/app-error.ts`). Controller memetakan `AppError` ke key i18n. Kelas error per kasus (`QuotaExceededError` di `init/clean-arch`) tidak diambil: kode error BE (`QUOTA_EXCEEDED`, `STOCK_INSUFFICIENT`) sudah cukup untuk memilih pesan, dan union bisa diperiksa lengkap oleh TypeScript.
- Axios dan interceptor dari `init/clean-arch` tidak diambil. `FetchHttpClient` sudah melakukan hal yang sama (URL dasar, parse JSON, pemetaan error) tanpa dependensi tambahan, dan bisa diganti lewat `HttpClient` bila nanti perlu.

### Konstanta (diambil dari `init/clean-arch`)

Angka bisnis dan interval ada di `domain/<m>.constants.ts` (atau `core/domain` bila dipakai lebih dari satu modul), masing-masing dengan rujukan requirement atau ADR: `MAX_TICKETS_PER_NIK` (BR-01), `STOCK_REFRESH_INTERVAL_MS` (ADR-0004), `PAYMENT_STATUS_POLL_INTERVAL_MS` (ADR-0016), `COUNTDOWN_URGENT_AT_MS`. Nilai yang berbeda per environment tetap di `AppConfig`, bukan konstanta.

### Aturan SOLID

- **SRP**: satu use case satu kelas dengan satu `execute()`. Satu service per protocol. Mapper murni terpisah dari controller.
- **OCP**: modul baru ditambahkan dengan folder baru dan satu baris di `src/di/container.ts`; modul lain tidak diubah.
- **LSP**: service HTTP, fake di test, dan kelak cache/offline bisa saling ganti selama memenuhi protocol yang sama.
- **ISP**: protocol kecil. `OrderProtocol` terpisah dari `PaymentSimulatorProtocol` yang hanya ada di mode mock. Controller meminta irisan container yang ia butuhkan (`PaymentDependencies & CoreDependencies`), bukan seluruh container.
- **DIP**: use case bergantung pada protocol. Controller hanya mengenal tipe use case dan menerima instance dari container ([ADR-0015](0015-dependency-injection-awilix.md)). Jam, acak, dan konfigurasi diinjeksikan (`ClockProtocol`, `RandomProtocol`, `AppConfig`).

### Tipe use case

Use case adalah kelas; controller mengimpornya **sebagai tipe saja**. TypeScript bertipe struktural, jadi implementasi lain dengan bentuk yang sama bisa diregistrasikan tanpa interface terpisah. Protocol tetap interface eksplisit karena memang punya lebih dari satu implementasi (service dan fake).

### Yang tetap dari ADR-0002

- FE tidak pernah memanggil Midtrans. Pembayaran lewat endpoint BE (ADR-0006).
- Error dimodelkan sebagai `AppError`; `data` memetakan HTTP ke `AppFailure`, controller memetakan `AppError` ke key i18n.

## Konsekuensi

- **Positif**: nama folder dan file menyatakan isinya. Use case dites dengan fake biasa tanpa MSW atau memock modul. Mengganti transport atau menambah cache tidak menyentuh controller. Jam, acak, dan env tidak lagi tersembunyi. Angka bisnis ada di satu tempat per modul. Pelanggaran lapisan dan lintas modul gagal di lint.
- **Negatif**: lebih banyak file per fitur (protocol, use case, service, schema, registrasi). Use case yang hanya meneruskan ke protocol terlihat seremonial di awal; nilainya muncul saat orkestrasi bertambah (submit booking, `SESSION_REVOKED` global).
- **Yang harus dijaga**: `eslint.boundaries.mjs` dengan `default: "disallow"`; setiap perubahan aturan diverifikasi dengan file probe yang melanggar (domain → data, controller → nilai application, view → controller, lintas modul, `awilix` di application, `Math.random` di application). Coverage 85% untuk `domain`, `application`, `data` (modul dan `core`), dan `src/di`.
