# ActionDialog: dialog galat, peringatan, dan konfirmasi

Satu komponen untuk semua dialog yang meminta customer memilih tindakan: galat yang perlu keputusan, sesi yang
berakhir, dan tinjauan sebelum mengirim. Galat field biasa tetap di bawah field, dan pesan bisnis (stok berubah, NIK
sudah dipakai di event ini) tetap di kartu layar.

Galeri dialog (`/signal-demo/dialogs`) sudah dihapus; dialog diuji lewat test builder dan controller.

## Bagian

| Lapisan | File | Isi |
|---|---|---|
| Design system | `src/components/ui/layout/ActionDialog.tsx` | Komponen props-only. Desktop: modal di tengah (`dialog.tsx`). Mobile: bottom sheet (`sheet.tsx`, Base UI Drawer). |
| Design system | `src/components/ui/sheet.tsx` | Bottom sheet: pegangan, geser ke bawah untuk menutup, safe area, fokus terkunci. |
| Design system | `src/components/ui/media-query.hook.ts` | `useMediaQuery(MOBILE_QUERY)`; server dan render pertama dianggap desktop. |
| Core controllers | `src/core/controllers/modal.hook.ts` | `useModal<M>()` (state modal per layar) dan tipe `ActionDialogModel`. |
| Core controllers | `src/core/controllers/common-dialogs.mapper.ts` | Dialog lintas modul: koneksi, terjadi kesalahan, sesi berakhir. |
| Core controllers | `src/core/controllers/offline-dialog.hook.ts` | Dialog "tanpa jaringan" global (dipasang di `AppProviders`), muncul saat peramban offline. |
| Core controllers | `src/core/controllers/nik-dialog.mapper.ts` | Dialog verifikasi NIK (Detail Ticket, alias, register). |
| Modul auth | `src/modules/auth/controllers/auth-dialogs.mapper.ts` | Dialog login dan register. |

`ActionDialogModel` (core) dan `ActionDialogProps` (design system) berbentuk sama. Dideklarasikan dua kali karena
`core/controllers` tidak boleh mengimpor design system; TypeScript mencocokkannya secara struktural, jadi perubahan
bentuk harus dilakukan di keduanya.

## Anatomi

| Prop | Wajib | Arti |
|---|---|---|
| `tone` | ya | `error` (merah), `warning` (kuning, sesi atau waktu), `info` (biru, tinjauan), `success` (hijau). |
| `icon` | tidak | `alert`, `clock`, `mail`, `check`, `info`. Bawaan mengikuti `tone`. |
| `illustration` | tidak | Ilustrasi Signal DS menggantikan ikon: `network`, `confirmation`, `success`, `email`, `error` (`public/images/illustrations/`). |
| `title`, `description` | ya | Judul singkat dan satu sampai dua kalimat penjelasan. Dari i18n. |
| `details` | tidak | Ringkasan isian (label dan nilai), misalnya email dan NIK sebelum mendaftar. |
| `note` | tidak | Catatan kecil di bawah ringkasan atau penjelasan. |
| `error` | tidak | Galat yang tidak menutup dialog (mis. terlalu banyak permintaan saat konfirmasi). |
| `primary` | ya | Aksi utama, tombol merah penuh. `{ label, onClick, busy? }` atau tautan `{ label, href }`. |
| `secondary` | tidak | Aksi cadangan, tombol garis merah. Bentuk sama dengan `primary`. |
| `onDismiss` | ya | Escape, klik di luar, tombol tutup, dan geser ke bawah. Tidak dipanggil selama `primary.busy`. |

Tampilan: ikon dalam lingkaran 64px, judul `type-h5`, penjelasan `type-body1`, tombol pil setinggi 48px selebar
dialog. Tombol tutup (X) selalu ada kecuali aksi utama sedang berjalan.

## Responsif

| Lebar | Bentuk | Perilaku |
|---|---|---|
| < 640px (`sm`) | Bottom sheet | Muncul dari bawah, pegangan di atas, geser ke bawah untuk menutup, sudut atas `rounded-3xl`, padding bawah mengikuti safe area, tinggi maks. 92dvh dan isi bisa digulir. |
| ≥ 640px | Modal di tengah | Lebar maks. `lg`, sudut `rounded-3xl`, padding 32px. |

Keduanya mengunci fokus, mengunci scroll halaman, menutup dengan Escape, dan mengembalikan fokus ke pemicu.
`role` adalah `alertdialog` untuk `error` dan `warning`, selain itu `dialog`.

## Layar status satu halaman

Halaman yang belum bisa menampilkan isinya (memuat, dialihkan, waktu habis, gagal total) memakai `StatusView`
(`src/components/ui/layout/StatusView.tsx`) dengan bahasa visual yang sama: kartu di tengah, ikon dalam lingkaran
(spinner untuk `neutral`, peringatan untuk `warning`, galat untuk `error`), judul, penjelasan, dan tombol pil. Controller
menyertakan `...siteChrome` supaya navbar dan footer tetap ada. Fallback Suspense (`ScreenLoading` di `src/components/ui/layout/PageSkeleton.tsx`) memakai header merek dan kerangka layar
saja karena status masuk belum diketahui. Kartu berkepala merah (`ScreenFrame`) tidak dipakai untuk status lagi.

## Kapan memakai dialog

- **Ya**: hasil belum diketahui atau ada pilihan tindakan (coba lagi, ubah data, masuk lagi); sesi berakhir; tinjauan
  sebelum tindakan yang tidak bisa dibatalkan.
- **Tidak**: galat bentuk field (16 digit NIK, email), pesan bisnis yang sudah jelas di layar (stok, kuota, NIK sudah
  dipakai di event ini), dan status yang berubah sendiri (antrian, pembayaran). Itu tetap inline.
- **Galat tanpa dialog khusus**: `toRequestFailedDialog(error)` memilih "Koneksi bermasalah" (tanpa respons) atau
  "Terjadi kesalahan" (5xx, respons tidak sesuai kontrak). `isUnexpectedError(error)` memisahkannya dari galat bisnis.
- **Satu dialog sekaligus.** Bila dua kejadian bersaing, yang terakhir menggantikan yang sebelumnya.

## Aturan perilaku

1. **Isian tidak pernah hilang.** Dialog galat tidak mengosongkan form; "Ubah data" menutup dialog dan memfokus field
   lewat `focusKey` dengan nilai lama.
2. **Tidak menyalahkan isian bila hasil belum diketahui.** Timeout Dukcapil memakai "Verifikasi NIK belum tersedia",
   bukan "NIK salah".
3. **Coba lagi hanya atas tindakan customer.** Tidak ada percobaan ulang otomatis dari dialog. Selama permintaan
   ulang berjalan, `primary.busy` mengunci dialog.
4. **Keputusan pasti tidak ditawari coba lagi.** Dukcapil menolak NIK: hanya "Ubah data".
5. **Jangan PHP.** Sesi berakhir tidak membatalkan booking; dialog hanya mengajak masuk lagi.
6. **Token tidak pernah tampil** di dialog mana pun.

## Manajemen modal

State modal adalah state UI milik controller satu layar. Tidak ada Context, store global, atau "modal service"
(ADR-0003, ADR-0004).

```ts
// Di awal controller, sebelum early return.
const modal = useModal<{ kind: "nikMismatch"; slotKey: string } | { kind: "submitFailed"; input: SubmitBookingInput }>();

// Buka dari onError mutation atau hasil use case.
onError: (failure, input) => {
  if (isUnexpectedError(toAppError(failure))) modal.open({ kind: "submitFailed", input });
},

// Petakan ke props View lewat builder katalog.
let dialog: ActionDialogModel | undefined;
const open = modal.modal;
if (open?.kind === "submitFailed") {
  dialog = toRequestFailedDialog(toAppError(submit.error), {
    onRetry: () => submit.mutate(open.input),
    onDismiss: modal.close,
    retrying: submit.isPending,
  });
}
return { ...view, dialog };
```

View cukup merender `{dialog ? <ActionDialog {...dialog} /> : null}`.

## Katalog

| Dialog | Builder | Nada | Aksi | Pemicu | Dipakai di |
|---|---|---|---|---|---|
| Koneksi bermasalah | `toConnectionProblemDialog` | error | Coba lagi | Tidak ada respons (`kind: "network"`) | Login, register, Detail Ticket (submit), hapus alias |
| Terjadi kesalahan | `toSomethingWentWrongDialog` | error | Coba lagi | 5xx atau respons di luar kontrak | Detail Ticket (submit), hapus alias |
| Sesi berakhir | `toSessionExpiredDialog` | warning | Masuk lagi (tautan), Tutup | 401 setelah refresh gagal | Profil (simpan dan hapus alias) |
| Verifikasi NIK belum tersedia | `toNikUnavailableDialog` | error | Coba lagi, Ubah data | Dukcapil tidak menjawab | Detail Ticket (cek NIK), alias |
| Periksa NIK-mu | `toNikMismatchDialog` | error | Ubah data | Dukcapil menolak (tidak ditemukan, nonaktif) | Detail Ticket, alias, register |
| Layanan sedang tidak tersedia | `toServiceUnavailableDialog` | error | Coba lagi, Tutup | Layanan auth 5xx atau respons asing | Login (minta dan kirim ulang link) |
| Pendaftaran gagal | `toRegistrationFailedDialog` | error | Coba lagi, Tutup | Register 5xx atau respons asing | Register |
| Akun sudah terdaftar | `toAlreadyRegisteredDialog` | error | Masuk (tautan), Ubah email | Register 409 | Register |
| Link login gagal | `toLoginLinkFailedDialog` | error | Minta link login baru (tautan) | Link login sudah dipakai atau kedaluwarsa, tanpa sesi | Verifikasi login |
| Verifikasi email gagal | `toEmailVerificationFailedDialog` | error | Kirim ulang email verifikasi | Link verifikasi email tidak valid | Belum dipakai: kontrak belum punya endpoint verifikasi pendaftaran |
| Konfirmasi datamu | (di `register.controller.ts`) | info, ikon `mail` | Konfirmasi & daftar, Ubah data | Submit form register | Register |
| Pendaftaran berhasil | (di `register.controller.ts`) | success | Mengerti | Register berhasil | Register |
| Hapus alias? | (di `account.controller.ts`) | error | Hapus alias, Batal | Tombol hapus alias | Profil |
| Koneksi bermasalah / Terjadi kesalahan | `toRequestFailedDialog` | error | Coba lagi | Bayar gagal tanpa respons atau respons asing; metode yang dipilih tetap | Payment |

Teks lengkap ada di `src/core/i18n/id.messages.ts` dengan awalan `dialog.` (dan `register.confirm.` / `register.success.`).

## Menambah dialog

1. Tentukan apakah perlu dialog (lihat "Kapan memakai dialog"). Bila cukup inline, jangan buat dialog.
2. Tambah teks di `id.messages.ts` dengan awalan `dialog.<nama>.`.
3. Tulis builder `to<Nama>Dialog` yang mengembalikan `ActionDialogModel`: di `common-dialogs.mapper.ts` bila dipakai
   lebih dari satu modul, selain itu di `controllers/` modul pemakainya.
4. Di controller: tambah `kind` ke tipe `useModal`, buka dari `onError` atau hasil use case, lalu petakan ke `dialog`.
5. Test: builder (teks dan aksi) dan controller (pemicu, isian tetap, aksi coba lagi atau ubah data).
6. Tambah baris di katalog ini.

## Ilustrasi dan teks dari spreadsheet referensi aset

Sumber: spreadsheet "Icon & Asset reference for SJT". Ilustrasi diambil dari lembar sprite Signal DS
(`illustration-lg-row2/3/5`) lalu dipotong per gambar menjadi WebP.

| Dialog | Ilustrasi | Teks (ID) | Di mana |
|---|---|---|---|
| Tanpa jaringan | `network` (failed) | Anda terputus, periksa koneksi internet anda | `offline-dialog.hook.ts` (offline), `toConnectionProblemDialog` (permintaan tanpa respons) |
| Keluar dari antrian | `confirmation` | Anda akan keluar dari antrian, anda akan mendapatkan nomor antrian baru jika memutuskan untuk masuk kembali | `queue.controller.ts` |
| Info setelah register | `success` | Anda berhasil mendaftarkan akun, silahkan cek email anda dan lakukan verifikasi dengan mengakses link yang telah dikirimkan | `register.controller.ts` |
| Info setelah login | `email` (submit) | Periksa link tautan yang telah dikirim ke Email anda untuk menyelesaikan Login | `login.controller.ts` |
| Error umum (timeout atau galat BE) | `error` (load_data_failed) | Terjadi kesalahan, silahkan coba kembali | `toSomethingWentWrongDialog`, layanan auth, pendaftaran gagal |
| Konfirmasi untuk booking | | Belum diisi di spreadsheet | Belum dibuat |
