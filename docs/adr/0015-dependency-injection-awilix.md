# ADR-0015: Dependency injection dengan Awilix di composition root

- **Status**: Proposed
- **Tanggal**: 2026-10-28
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-02, NFR-07
- **Terkait**: [ADR-0003](0003-presentation-pattern-viewmodel-hooks.md), [ADR-0014](0014-modular-clean-architecture-solid.md)

## Konteks

ADR-0014 memisahkan use case dan port dari implementasinya. Harus ada satu tempat yang memasangkan port ke adapter, dan cara bagi ViewModel (hook React) maupun Server Component (Home) mendapatkan use case tanpa mengimpor infrastruktur. Aplikasi diasumsikan bertambah modul, jadi wiring manual (`new ListEvents({ eventRepository: new HttpEventRepository(...) })`) di banyak tempat tidak bertahan.

Batasan:

- ViewModel tetap custom hook (ADR-0003). Tidak boleh ada class ViewModel, lifecycle buatan, atau Provider per layar.
- Root layout tidak memasang provider client; Home tetap statis (ADR-0007).
- Build produksi diminifikasi.
- Tim lama pernah memakai Awilix (proyek MBC), jadi pengetahuannya sudah ada.

## Opsi yang dipertimbangkan

1. **Wiring manual** (factory function di satu file). Tanpa dependensi baru, tetapi setiap modul baru mengubah factory pusat secara manual, tidak ada pengecekan registrasi yang hilang, dan lifetime (singleton per container) diatur tangan.
2. **InversifyJS / tsyringe.** Berbasis decorator dan `reflect-metadata`; menambah konfigurasi compiler (`experimentalDecorators`) dan polyfill, serta mengikat kelas domain/application ke library DI lewat decorator.
3. **Awilix** (dipilih). Tanpa decorator, kelas tetap TypeScript biasa dengan constructor injection. Mode `PROXY` membaca dependensi dari objek cradle sehingga aman diminifikasi. Ada build browser.
4. **React Context per dependensi.** Melanggar ADR-0003 (Provider per kebutuhan) dan tidak bisa dipakai di Server Component.

## Keputusan

Opsi 3, dengan aturan:

1. **Composition root di `src/di`.** Hanya `src/di` dan file `src/modules/<m>/<m>.module.ts` yang boleh mengimpor `awilix` (ditegakkan ESLint). `createAppContainer(config)` merakit `coreModule(config)` (registrasi `core` dan `platform`, di `src/di/core.module.ts`) dan registrasi setiap modul.
2. **`InjectionMode.PROXY` dan `strict: true`.** Kelas menerima satu objek dependensi: `constructor({ eventRepository }: { eventRepository: EventRepository })`. CLASSIC tidak dipakai karena bergantung pada nama parameter yang hilang saat minifikasi. `strict` menggagalkan registrasi yang hilang dan lifetime yang bocor.
3. **Lifetime**: use case dan adapter `singleton` per container; konfigurasi dan `fetchFn` `asValue`. Container dibuat **per mount `AppProviders`** di browser dan **sekali per proses** di server (`getServerCradle`).
4. **Presentation tidak mengenal Awilix.** `DependencyProvider` (di `ui/di`) menyimpan `container.cradle` di satu Context global yang stabil, sesuai ADR-0003 aturan 4. ViewModel memakai `useCradle<T>()` dan meminta irisan bertipe: `const { getOrder, appConfig } = useCradle<PaymentDependencies & CoreDependencies>()`. Ambil dengan destructuring supaya hanya yang diminta yang di-resolve.
5. **Server Component** (Home) memanggil `getServerCradle()` dari route di `app/`, lalu meneruskannya ke loader presentation (`loadHomeViewProps(getServerCradle())`). Kebijakan cache (`"use cache"`, `cacheLife`) tetap di route karena itu urusan framework (ADR-0007).
6. **Hanya composition root yang membaca `process.env`** (`src/di/config.ts` → `AppConfig`). Pengecualian: kondisi pemuatan MSW tetap ditulis literal agar bundler membuang kode mock dari build produksi.
7. **Modul baru** mengekspor `<m>Module(): NameAndRegistrationPair<<M>Cradle>` dari `<m>.module.ts`, menambah tipenya ke `AppCradle`, dan menyebarkannya di `createAppContainer`.
8. **Test** memakai container yang sama dengan produksi (`setupTestContainer` di `src/test/support.tsx`), dengan `overrides` untuk mengganti registrasi tertentu (mis. `clock`) dan config uji (`appBaseUrl` origin palsu, `bookingExpiry`), tanpa `vi.mock` atau `vi.stubGlobal`.

## Konsekuensi

- **Positif**: satu tempat wiring; modul baru tidak mengubah modul lain. Kelas domain/application/infrastructure bebas dari library DI. Test ViewModel bisa mengganti satu dependensi tanpa memock modul (contoh: mode `bookingExpiry: "screen"` kini dites lewat config). Test `src/di/container.test.ts` me-resolve setiap registrasi, jadi registrasi yang hilang gagal di CI.
- **Negatif**: dependensi runtime baru (Awilix 13, kira-kira 11 KB gzip sebelum minifikasi di bundle klien). Pengecekan tipe registrasi lemah: `asClass` tidak memeriksa bahwa dependensi constructor ada di cradle, sehingga kesalahan nama baru tertangkap test container, bukan `tsc`. `useCradle<T>()` adalah cast; tipe yang diminta harus sesuai `dependencies.ts` modul.
- **Yang harus dijaga**: ESLint melarang `awilix` di domain, application, infrastructure, dan presentation. `container.test.ts` wajib hijau. Awilix perlu dicek terhadap tech radar perusahaan.
