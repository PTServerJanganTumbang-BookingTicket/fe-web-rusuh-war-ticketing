# Konvensi Kode

## Bahasa dan tipe

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Tidak ada `any`. Gunakan `unknown` lalu parse.
- Tipe domain di `core` memakai discriminated union untuk state (`{ status: 'held'; expiresAt: string } | ...`).

## Penamaan

| Hal | Konvensi | Contoh |
|---|---|---|
| File komponen | PascalCase | `QueuePosition.tsx` |
| File non-komponen | camelCase | `remainingMs.ts` |
| File test unit | `<nama sumber>.test.ts(x)` di `__tests__/` folder sumbernya | `time/__tests__/remainingMs.test.ts` |
| Screen model | file `<screen>Model.ts`, tipe `<Screen>ScreenState`, fungsi `derive<Screen>ScreenState`; akhiran `Screen` membedakannya dari tipe domain (`QueueState`) | `bookingModel.ts` → `BookingScreenState` |
| ViewModel | `use<Screen>ViewModel`, mengembalikan `<Screen>ViewModel = { state, actions }` | `useBookingViewModel` |
| Mapper ke props View | `to<Screen>ViewProps` (murni, di folder fitur) | `toBookingViewProps` |
| Contract dan mapper DTO (`api`) | file per resource di `contracts/` dan `mappers/`; schema `<x>Response`/`<x>Request`, tipe `<X>Dto`, mapper `to<Domain>` | `contracts/auth.ts`, `toAccount` |
| Helper test yang bukan hook | awalan `setup`, bukan `use` (lint `rules-of-hooks`) | `setupMockServer` |
| Flag build | `NEXT_PUBLIC_<NAMA>` di `.env.example` dan `ARG` di `Dockerfile` | `NEXT_PUBLIC_BOOKING_EXPIRY` |
| Use case (`core/application`) | fungsi `kataKerjaObjek`, port lewat argumen pertama `deps` bertipe `<UseCase>Deps` | `payOrder(deps, order, method)` |
| Port | tipe fungsi `PascalCase` di `application/ports.ts`, tanpa awalan `I` | `StartPayment` |
| Container | `<Screen>Container` | `BookingContainer` |
| View | `<Screen>View` | `BookingView` |
| Reducer event | `SCREAMING_SNAKE` di `type` | `{ type: 'ADD_TICKET' }` |
| Key i18n | `feature.context.message` | `booking.quota.exceeded` |
| Query key | factory di `api/queryKeys.ts` | `queryKeys.queue.position(eventId)` |

## Komponen

- Komponen `ui` memakai komponen Signal DS sebagai dasar. Tailwind hanya untuk layout dan spacing yang tidak disediakan Signal.
- Token warna dan tipografi diambil dari preset Signal, bukan nilai hex langsung.
- Setiap komponen interaktif bisa dioperasikan dengan keyboard dan punya label aksesibel. Countdown: elemen `role="timer"` dengan `aria-live="off"` agar tidak diumumkan tiap detik. Pengumuman lewat live region terpisah: peringatan 60 detik memakai `assertive`. Pengingat berkala (`polite`) belum ada dan perlu diputuskan bersama tim aksesibilitas.

## Token desain

- Warna, radius, dan tipografi lewat token Signal DS: `bg-primary`, `text-muted-foreground`, `border`, `bg-signal-bg-valid`, `text-signal-error`, `bg-brand`. Nilainya ada di satu tempat, `packages/config/tailwind/signal.css` (ADR-0012).
- Tipografi memakai kelas skala Signal: `type-h1`…`type-h6` (Telkomsel Batik Sans) dan `type-title`, `type-body1`, `type-body2` (Poppins), bukan ukuran font ad hoc.
- Tidak ada hex, `rgb()`, atau nama warna Tailwind mentah (`violet-700`) di `packages/ui`.
- Elemen interaktif dan wadah dibangun dari primitif (`Button`, `Badge`, `Card`, `Alert`, `Progress`, `RadioGroup`). Varian Signal baru ditambahkan ke primitif, bukan ditulis ulang di view.
- Wireframe adalah referensi struktur dan isi, **bukan** desain visual. Target visual adalah Telkomsel Signal DS.

## ViewModel

- Kepala file mencantumkan ID requirement dan nomor wireframe yang dipenuhi.
- Mengembalikan union layar (`{ kind: 'ready' | 'status' | 'result', view }`) bila layar punya beberapa tampilan, supaya Container tinggal memilih View.

## Use case

- Fungsi biasa, bukan class. Tanpa I/O: fungsi murni (`addTicket(session, selection, id)`). Dengan I/O: `deps` memuat port, input menyusul (`payOrder(deps, order, method)`).
- Kegagalan port dilempar apa adanya (`AppFailure`); use case tidak menerjemahkannya ke teks. Pemetaan ke i18n tetap di ViewModel.
- Waktu masuk sebagai parameter (`now`, `remainingMs`), sama seperti seluruh `core`.
- Dites dengan port palsu (`vi.fn()`), bukan MSW.

## Kode

- Fungsi di `core` murni dan menerima `now` sebagai parameter bila butuh waktu.
- Tidak ada `console.log` di kode yang di-commit. Gunakan logger di `api/telemetry`.
- Komentar menjelaskan *mengapa*, bukan *apa*.
- Tidak ada abstraksi untuk satu pemakaian. Ekstrak setelah dipakai di tempat ketiga.

## Git

- Conventional Commits: `feat(booking): ...`, `fix(queue): ...`, `docs(adr): ...`.
- Satu PR satu concern. PR yang mengubah arsitektur menyertakan ADR.
- Tidak ada trailer atribusi atau co-authorship di commit dan PR.
