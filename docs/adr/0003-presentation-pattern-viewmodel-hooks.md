# ADR-0003: Pola presentasi — ViewModel sebagai custom hook, bukan MVVM berbasis class

- **Status**: Proposed
- **Tanggal**: 2026-10-18
- **Pengambil keputusan**: Tim FE Web, didiskusikan dengan seluruh tim
- **Requirement terkait**: NFR-01, NFR-02, NFR-06

## Konteks

Ada usulan memakai MVVM rigid: ViewModel berbentuk class dengan lifecycle sendiri (`onInit`, `onDestroy`), state observable sendiri, dan Context Provider per ViewModel. Tujuan usulan tersebut valid: View yang pasif, ViewModel yang jelas per layar, dan konsistensi pola dengan mobile.

Kendalanya, React sudah menyediakan lifecycle, state, dan mekanisme subscription. Membangun ulang ketiganya berarti membangun dan merawat framework internal.

## Opsi yang dipertimbangkan

### Opsi A: MVVM rigid berbasis class

- Lifecycle buatan menduplikasi `useEffect`, sehingga ada dua sumber kebenaran.
- State di luar React rawan *tearing* di concurrent rendering React 18/19, kecuali dibungkus `useSyncExternalStore` dengan benar di setiap VM.
- Instance class tidak bisa melewati batas Server Component ke Client Component. Provider memaksa subtree jadi client component, sehingga Home kehilangan static rendering dan bundle membesar.
- Polling, cache, retry, dan dedupe harus ditulis ulang di setiap VM.
- Test harus memalsukan lifecycle buatan sendiri.

### Opsi B: ViewModel sebagai custom hook (dipilih)

- **Model**: `packages/core` (aturan, reducer, tipe) dan `packages/api`.
- **ViewModel**: `features/<feature>/use<Screen>ViewModel.ts`, mengembalikan state siap tampil dan command.
- **View**: komponen di `packages/ui`, props-only.

```ts
export function useBookingViewModel(eventId: string) {
  const session = useBookingSession(eventId);              // TanStack Query
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
  const remainingMs = useCountdown(session.data?.expiresAt);
  const submit = useSubmitBooking();

  return {
    state,
    remainingMs,
    categories: session.data?.categories ?? [],
    canAdd: (categoryId: string) => canAddTicket(state.selection, state.quota, categoryId),
    add: (categoryId: string) => dispatch({ type: 'ADD', categoryId }),
    remove: (categoryId: string) => dispatch({ type: 'REMOVE', categoryId }),
    submit: () => submit.mutate(toBookingRequest(state)),
  };
}

export function BookingContainer({ eventId }: { eventId: string }) {
  const vm = useBookingViewModel(eventId);
  return <BookingView {...vm} />;
}
```

## Keputusan

Opsi B. Bentuknya MVVM, mekanismenya React, dan dependensinya mengikuti [ADR-0002](0002-layered-clean-architecture.md).

Aturan:

1. **Satu ViewModel per layar**, bernama `use<Screen>ViewModel`.
2. **ViewModel tipis.** Aturan bisnis wajib di `core` sebagai fungsi murni atau reducer.
3. **Tidak ada class ViewModel, lifecycle buatan, atau Provider per ViewModel.**
4. **Context hanya untuk nilai global yang stabil**: session user, offset jam server, adapter `PaymentResultNotifier`. Server state tidak boleh di Context.
5. **View tidak memanggil hook data.** View menerima hasil ViewModel lewat props.

Konsistensi dengan mobile dijaga di level konsep: nama state, nama event, dan spesifikasi state machine yang sama di [overview](../architecture/overview.md#5-state-machine-booking-fe). Mekanismenya tidak perlu sama karena runtime-nya berbeda.

## Konsekuensi

- **Positif (murah)**: tidak ada framework internal untuk dibangun dan dirawat. Developer React mana pun langsung produktif.
- **Positif (andal)**: aman untuk concurrent rendering, kompatibel dengan Server Component, logika kritis dites tanpa render.
- **Negatif**: disiplin "ViewModel tipis" bergantung pada review. Dimitigasi dengan steering AI dan checklist PR.
- **Validasi**: jika masih diperdebatkan, lakukan spike 2–3 jam pada layar Detail Ticket dengan kedua opsi. Bandingkan jumlah baris, jumlah test, dan perilaku di halaman ISR. Catat hasilnya di ADR ini.

## Catatan implementasi (2026-10-19)

- **Mapper murni per layar.** Di samping `use<Screen>ViewModel` ada `to<Screen>ViewProps.ts` yang mengubah data domain menjadi props View. Format, label i18n, dan state tombol dites tanpa render, dan ViewModel tetap tipis.
- **ViewModel boleh mengembalikan union layar** (`ready`, `status`, `result`) bila satu route punya beberapa tampilan.
- **Pengecualian Home.** Home adalah Server Component statis, jadi Container-nya async dan tidak memakai hook ViewModel.
- Test ViewModel memakai Testing Library dan server MSW bersama.
- **Orkestrasi di `core/application` (2026-10-22).** Alur yang merangkai aturan dan port (mulai pembayaran, masuk ruang booking, tambah tiket dari sesi server) adalah use case di `core`, bukan di hook. ViewModel memanggilnya lewat `application` di `features/shared/composition.ts`. Lihat [ADR-0015](0015-use-case-pure-functions-in-core.md).

