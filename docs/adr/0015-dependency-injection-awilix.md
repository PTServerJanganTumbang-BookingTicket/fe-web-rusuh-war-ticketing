# ADR-0015: Dependency injection dengan Awilix di composition root

- **Status**: Proposed
- **Tanggal**: 2026-10-29 (revisi dari 2026-10-28)
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-02, NFR-07
- **Terkait**: [ADR-0003](0003-presentation-pattern-viewmodel-hooks.md), [ADR-0014](0014-modular-clean-architecture-solid.md)

## Konteks

ADR-0014 memisahkan use case dan protocol dari service yang mengimplementasikannya. Harus ada satu tempat yang memasangkan protocol ke service, dan cara bagi controller (hook React) maupun Server Component (Home) mendapatkan use case tanpa mengimpor `data/`. Aplikasi diasumsikan bertambah modul, jadi wiring manual (`new ListEventsUseCase({ eventService: new HttpEventService(...) })`) di banyak tempat tidak bertahan.

Batasan:

- Controller tetap custom hook (ADR-0003). Tidak ada class controller, lifecycle buatan, atau Provider per layar.
- Root layout tidak memasang provider client; Home tetap statis (ADR-0007).
- Build produksi diminifikasi.
- Tim lama pernah memakai Awilix (proyek MBC), dan `init/clean-arch` juga memakainya.

## Opsi yang dipertimbangkan

1. **Wiring manual** (factory function di satu file). Tanpa dependensi baru, tetapi tidak ada pengecekan registrasi yang hilang, dan lifetime diatur tangan.
2. **InversifyJS / tsyringe.** Berbasis decorator dan `reflect-metadata`; menambah konfigurasi compiler dan mengikat kelas ke library DI.
3. **Awilix** (dipilih). Tanpa decorator; kelas tetap TypeScript biasa dengan constructor injection. Mode `PROXY` aman diminifikasi.
4. **React Context per dependensi.** Melanggar ADR-0003 (Provider per kebutuhan) dan tidak bisa dipakai di Server Component.

## Keputusan

Opsi 3, dengan aturan berikut.

### Siapa boleh mengenal Awilix

Hanya `src/di` dan file `<m>.module.ts` yang mengimpor `awilix` (ditegakkan ESLint). Domain, application, data, controllers, dan views tidak tahu library DI apa yang dipakai.

### Registrasi

- Setiap modul mengekspor `<m>Module(): NameAndRegistrationPair<<M>Registry>` dari `<m>.module.ts`. `<M>Registry` adalah tipe semua yang modul itu daftarkan: `<M>Dependencies` ditambah protocol yang hanya dipakai di dalam modul.
- `src/di/core.module.ts` mendaftarkan isi `core` (config, client, jam, acak, sesi). `createAppContainer(config)` di `src/di/container.ts` menggabungkan `coreModule` dan semua modul; `AppRegistry` adalah gabungan semua `Registry`.
- Nama registrasi adalah nama kelas atau protocol dalam camelCase:

| Yang didaftarkan | Nama registrasi | Contoh |
|---|---|---|
| Use case `<X>UseCase` | `<x>UseCase` | `startPaymentUseCase` |
| Protocol `<X>Protocol` | `<x>Service` | `orderService` (diisi `HttpOrderService`) |
| Jam, acak, konfigurasi, client | kata benda pendek | `clock`, `random`, `appConfig`, `httpClient` |

- `InjectionMode.PROXY` dan `strict: true`. Kelas menerima satu objek dependensi: `constructor({ orderService }: { orderService: OrderProtocol })`. CLASSIC tidak dipakai karena bergantung pada nama parameter yang hilang saat minifikasi; `strict` menggagalkan registrasi yang hilang dan lifetime yang bocor.
- Lifetime: use case dan service `singleton` per container; konfigurasi dan `fetchFn` `asValue`. Container dibuat **per mount `AppProviders`** di browser dan **sekali per proses** di server.

### Cara controller dan Server Component mendapatkan dependensi

- `DependencyProvider` (di `core/controllers/dependencies.context.tsx`) menyimpan objek dependensi container di satu Context global yang stabil, sesuai ADR-0003 aturan 4.
- Controller memanggil `useDependencies<T>()` dan meminta irisan bertipe, selalu dengan destructuring supaya hanya yang diminta yang di-resolve:

  ```ts
  const { getOrderUseCase, startPaymentUseCase, appConfig } =
    useDependencies<PaymentDependencies & CoreDependencies>();
  ```

- Server Component (Home) memanggil `getServerDependencies()` dari route di `app/`, lalu meneruskannya ke loader: `loadHomeViewProps(getServerDependencies())`. Kebijakan cache (`"use cache"`, `cacheLife`) tetap di route (ADR-0007).
- Hanya `src/di/app-config.reader.ts` yang membaca `process.env`. Pengecualian: kondisi pemuatan MSW ditulis literal agar bundler membuang kode mock dari build produksi.

### Modul baru

1. Tulis `<m>.module.ts` yang mengekspor `<m>Module()` dan `type <M>Registry`.
2. Tambahkan `<M>Registry` ke `AppRegistry` dan sebarkan `...<m>Module()` di `createAppContainer`.
3. `src/di/container.test.ts` otomatis me-resolve semua registrasi baru.

### Test

Test memakai container yang sama dengan produksi (`setupTestContainer(overrides, config)` di `src/test/support.tsx`). `overrides` mengganti registrasi tertentu (mis. `clock`, `eventSourceFactory`), `config` mengganti `AppConfig`. Tidak ada `vi.mock` modul aplikasi atau `vi.stubGlobal`.

## Konsekuensi

- **Positif**: satu tempat wiring; modul baru tidak mengubah modul lain. Kelas di domain, application, dan data bebas dari library DI. Test bisa mengganti satu dependensi tanpa memock modul. `container.test.ts` me-resolve setiap registrasi, jadi registrasi yang hilang gagal di CI.
- **Negatif**: dependensi runtime baru (Awilix 13, kira-kira 11 KB gzip sebelum minifikasi). Pengecekan tipe registrasi lemah: `asClass` tidak memeriksa bahwa dependensi constructor ada di container, jadi salah nama tertangkap test container, bukan `tsc`. `useDependencies<T>()` adalah cast; tipe yang diminta harus sesuai `<m>.dependencies.ts`.
- **Yang harus dijaga**: ESLint melarang `awilix` di luar `src/di` dan `<m>.module.ts`. `container.test.ts` wajib hijau. Awilix perlu dicek terhadap tech radar perusahaan.
