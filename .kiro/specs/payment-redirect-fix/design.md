# Payment Redirect Fix Bugfix Design

## Overview

Bug pada halaman booking tiket (`/events/{eventSlug}/book`) dimana tombol "Lanjut ke Pembayaran" tidak memberikan feedback saat form tidak valid, menyebabkan user tidak dapat melanjutkan proses pemesanan. Root cause adalah validasi form (`isBookingFormValid()`) gagal secara silent tanpa memicu tampilan error message. Strategi fix adalah menambahkan visual feedback yang jelas saat validasi gagal, baik melalui disabled state pada tombol atau menampilkan error message pada field yang tidak valid.

## Glossary

- **Bug_Condition (C)**: Kondisi dimana user mengklik tombol "Lanjut ke Pembayaran" dengan form yang tidak valid (NIK salah format, email kosong/invalid, atau nama kosong)
- **Property (P)**: Sistem menampilkan error message pada field yang tidak valid dan/atau tombol disabled saat form belum valid
- **Preservation**: Perilaku submit yang sudah benar (redirect ke payment saat valid, loading state, error API) harus tetap berfungsi
- **isBookingFormValid()**: Fungsi di `booking.mapper.ts` yang memvalidasi kelengkapan form: buyerName tidak kosong, contactEmail valid, semua NIK berformat 16 digit, tidak ada duplikat NIK, dan tidak ada NIK yang ditolak Dukcapil
- **BookingForm**: State form yang berisi buyerName, contactEmail, niks (per slot), checks (hasil validasi Dukcapil), touched (field yang sudah di-blur), dan submitted flag
- **slotKey**: Identifier unik untuk setiap tiket yang dipilih, format `{categoryId}-{index}`

## Bug Details

### Bug Condition

Bug terjadi saat user mengklik tombol "Lanjut ke Pembayaran" dengan form yang tidak valid. Controller hanya melakukan `return` tanpa memberikan feedback ke user. Tombol tetap enabled meskipun `isBookingFormValid()` akan return false, sehingga user tidak mengetahui apa yang salah.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type FormSubmitEvent
  OUTPUT: boolean
  
  LET form = currentBookingForm()
  LET slotKeys = selectedTicketSlots()
  
  RETURN input.action == "submit"
         AND NOT isBookingFormValid(form, slotKeys)
         AND (
           form.buyerName.trim() == ""
           OR NOT isEmail(form.contactEmail)
           OR EXISTS slot IN slotKeys WHERE NOT isNikFormat(form.niks[slot])
           OR EXISTS slot IN slotKeys WHERE nikIsDuplicate(slot, form.niks)
           OR EXISTS slot IN slotKeys WHERE nikIsRejected(slot, form.checks)
         )
END FUNCTION
```

### Examples

- User mengisi NIK "123" (bukan 16 digit) → klik tombol → tidak ada feedback, tombol tetap enabled
- User tidak mengisi nama pembeli → klik tombol → tidak ada feedback, tombol tetap clickable
- User mengisi email "invalid-email" → klik tombol → tidak ada error message
- User mengisi 2 tiket dengan NIK yang sama → klik tombol → tidak ada indikasi duplikat sebelum submit

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- WHEN semua field valid THEN sistem memanggil `submitBookingUseCase` dan redirect ke `/orders/{bookingId}/pay`
- WHEN API call gagal THEN sistem menampilkan error message dari response API
- WHEN countdown timer habis THEN tombol submit disabled
- WHEN tidak ada tiket dipilih (count === 0) THEN tombol submit disabled
- WHEN proses submit sedang berjalan (submitting === true) THEN tombol disabled dengan loading indicator
- WHEN NIK valid dan terverifikasi Dukcapil THEN tampilkan success message dengan nama pemilik
- WHEN NIK ditolak Dukcapil THEN tampilkan error sesuai status (not_found, inactive, used)

**Scope:**
Semua interaksi form yang sudah berfungsi dengan benar (validasi on-blur untuk NIK, success/error message dari Dukcapil, countdown, kategori selection) tidak boleh terpengaruh oleh fix ini.

## Hypothesized Root Cause

Berdasarkan analisis kode, root cause yang paling mungkin adalah:

1. **Submit handler tidak memicu tampilan error**: Pada `booking.controller.ts` baris 160-171, ketika `isBookingFormValid()` return false, handler langsung `return` tanpa efek samping. State `submitted` di-set `true` sebelum validasi, tapi error message hanya muncul jika `show()` return true (form.submitted || form.touched).

2. **Button disabled state tidak memeriksa form validity**: Pada `booking.mapper.ts` baris 207, button disabled hanya memeriksa `count === 0 || remainingMs <= 0 || input.submitting`. Tidak ada pengecekan `isBookingFormValid()`.

3. **Error message tidak langsung visible setelah submit**: Meskipun `setSubmitted(true)` dipanggil, komponen belum re-render dengan error message yang visible karena flow langsung return setelah validasi gagal.

4. **Tidak ada form-level error feedback**: Saat multiple field invalid, user harus scroll dan mencari field mana yang error. Tidak ada summary error atau focus ke field pertama yang error.

## Correctness Properties

Property 1: Bug Condition - Form Validation Feedback

_For any_ submit action where form is invalid (isBookingFormValid returns false), the fixed implementation SHALL display visible error messages on all invalid fields immediately after the submit attempt, allowing the user to identify and correct the issues.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Valid Form Submit Behavior

_For any_ submit action where form is valid (isBookingFormValid returns true), the fixed implementation SHALL produce exactly the same behavior as the original implementation: call submitBookingUseCase, show loading state, and redirect to payment page on success.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Berdasarkan root cause analysis:

**File**: `src/modules/booking/controllers/booking.mapper.ts`

**Function**: `toBookingViewProps`

**Specific Changes**:

1. **Tambah disabled state berdasarkan form validity**: Modifikasi properti `submit.disabled` untuk menyertakan pengecekan `isBookingFormValid()` sehingga tombol disabled saat form tidak valid.

   ```typescript
   // Sebelum:
   disabled: count === 0 || remainingMs <= 0 || input.submitting,
   
   // Sesudah:
   disabled: count === 0 || remainingMs <= 0 || input.submitting || !isBookingFormValid(form, slots.map(s => s.key)),
   ```

2. **Pastikan error muncul setelah submit attempt**: Error message sudah akan muncul karena `show()` mengecek `form.submitted`. Verifikasi bahwa setelah `setSubmitted(true)` di controller, semua field yang error akan menampilkan message.

3. **Tambah visual hint saat tombol disabled karena form invalid**: Tambahkan properti baru untuk menunjukkan alasan tombol disabled (optional enhancement).

**File**: `src/modules/booking/controllers/booking.controller.ts`

**Function**: `onSubmit` handler

**Specific Changes**:

1. **Tidak ada perubahan diperlukan**: Current implementation sudah memanggil `setSubmitted(true)` sebelum validasi, yang akan memicu re-render dengan error messages visible. Issue sebenarnya ada di mapper yang tidak disable tombol berdasarkan validity.

**File**: `src/modules/booking/views/BookingView.tsx`

**Specific Changes**:

1. **Tidak ada perubahan struktural diperlukan**: View sudah mendukung tampilan error pada setiap field melalui `TextFieldProps.error`. Setelah mapper memperbaiki disabled state, flow akan bekerja dengan benar.

## Testing Strategy

### Validation Approach

Testing strategy menggunakan two-phase approach: pertama surface counterexamples pada kode unfixed, kemudian verifikasi fix bekerja dan preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples yang mendemonstrasikan bug SEBELUM implementasi fix. Konfirmasi atau refute root cause analysis.

**Test Plan**: Tulis unit tests yang simulate form state dengan berbagai kondisi invalid dan assert bahwa error message ditampilkan dan/atau tombol disabled. Jalankan pada UNFIXED code untuk observe failures.

**Test Cases**:
1. **Invalid NIK Format Test**: Form dengan NIK "123" → expect tombol disabled atau error visible (akan fail pada unfixed code)
2. **Empty Buyer Name Test**: Form dengan buyerName kosong → expect tombol disabled atau error visible (akan fail pada unfixed code)
3. **Invalid Email Test**: Form dengan email "invalid" → expect tombol disabled atau error visible (akan fail pada unfixed code)
4. **Duplicate NIK Test**: Form dengan 2 slot NIK sama → expect tombol disabled atau error visible (akan fail pada unfixed code)

**Expected Counterexamples**:
- Tombol submit enabled meskipun form tidak valid
- Tidak ada error message saat submit dengan form invalid
- Possible causes: disabled state tidak memeriksa form validity, error display logic tidak triggered

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input dimana bug condition berlaku, fixed function menghasilkan expected behavior.

**Pseudocode:**
```
FOR ALL formState WHERE isBugCondition(formState) DO
  result := toBookingViewProps_fixed(formState)
  ASSERT result.submit.disabled == true OR hasVisibleErrors(result)
END FOR
```

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input dimana bug condition TIDAK berlaku, fixed function menghasilkan hasil yang sama dengan original function.

**Pseudocode:**
```
FOR ALL formState WHERE NOT isBugCondition(formState) DO
  ASSERT toBookingViewProps_original(formState).submit == toBookingViewProps_fixed(formState).submit
END FOR
```

**Testing Approach**: Property-based testing direkomendasikan untuk preservation checking karena:
- Menghasilkan banyak test cases secara otomatis untuk berbagai kombinasi form state
- Menangkap edge cases yang mungkin terlewat unit tests manual
- Memberikan jaminan kuat bahwa behavior tidak berubah untuk semua valid inputs

**Test Plan**: Observe behavior pada UNFIXED code untuk valid form submissions, kemudian tulis property-based tests yang capture behavior tersebut.

**Test Cases**:
1. **Valid Form Submit Preservation**: Verifikasi form dengan semua field valid tetap bisa submit dan redirect ke payment
2. **Loading State Preservation**: Verifikasi loading indicator muncul saat submitting
3. **API Error Preservation**: Verifikasi error dari API tetap ditampilkan dengan benar
4. **Countdown Disabled Preservation**: Verifikasi tombol tetap disabled saat countdown habis

### Unit Tests

- Test `toBookingViewProps` dengan form invalid → expect `submit.disabled === true`
- Test `toBookingViewProps` dengan form valid → expect `submit.disabled === false` (selain disabled karena count/time)
- Test error message muncul untuk setiap jenis invalid field setelah submitted=true
- Test kombinasi: beberapa field invalid sekaligus

### Property-Based Tests

- Generate random BookingForm dengan berbagai kombinasi valid/invalid fields
- Verify: jika `isBookingFormValid` returns false, maka `submit.disabled === true` atau ada visible errors
- Verify: jika `isBookingFormValid` returns true dan count > 0 dan remainingMs > 0, maka `submit.disabled === false`

### Integration Tests

- E2E test: isi form dengan NIK invalid → klik submit → expect error visible, tidak redirect
- E2E test: isi form dengan semua valid → klik submit → expect redirect ke payment page
- E2E test: isi form partially → expect visual feedback pada tombol (disabled atau enabled dengan error saat click)
