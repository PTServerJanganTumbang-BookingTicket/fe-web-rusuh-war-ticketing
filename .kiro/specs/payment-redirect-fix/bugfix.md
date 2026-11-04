# Bugfix Requirements Document

## Introduction

Bug pada halaman booking tiket (`/events/{eventSlug}/book`) dimana tombol "Lanjut ke Pembayaran" tidak melakukan redirect ke halaman payment. Setelah investigasi kode, ditemukan bahwa validasi form gagal secara silent tanpa memberikan feedback ke user. Button submit tetap enabled meskipun form belum valid, dan tidak ada indikasi error saat validasi gagal.

**Impact:** User tidak dapat melanjutkan proses pemesanan tiket karena tidak menyadari bahwa form belum valid. User experience sangat buruk karena tidak ada feedback sama sekali.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user mengisi NIK dengan format tidak valid (bukan 16 digit angka) THEN tombol "Lanjut ke Pembayaran" tetap enabled dan saat diklik tidak ada feedback apapun ke user

1.2 WHEN user mengklik tombol submit dengan form yang belum valid (NIK salah, email kosong, atau nama kosong) THEN sistem tidak memberikan pesan error dan tidak ada perubahan visual pada tombol atau form

1.3 WHEN validasi `isBookingFormValid()` return false THEN sistem langsung return tanpa memicu mutasi API dan tanpa menampilkan error message

1.4 WHEN user belum mengisi nama pembeli atau email THEN tombol tetap clickable dan tidak ada indikasi bahwa field tersebut required

### Expected Behavior (Correct)

2.1 WHEN user mengisi NIK dengan format tidak valid (bukan 16 digit angka) THEN tombol "Lanjut ke Pembayaran" SHALL disabled dengan visual indicator yang jelas ATAU saat diklik SHALL menampilkan pesan error pada field NIK yang tidak valid

2.2 WHEN user mengklik tombol submit dengan form yang belum valid THEN sistem SHALL menampilkan pesan error yang menjelaskan field mana yang perlu diperbaiki dan focus SHALL dipindahkan ke field pertama yang error

2.3 WHEN validasi `isBookingFormValid()` return false THEN sistem SHALL set state `submitted` ke true untuk memicu tampilan error pada semua field yang tidak valid

2.4 WHEN user belum mengisi nama pembeli atau email THEN sistem SHALL menampilkan indikasi required field (setelah field di-blur atau form di-submit) dan tombol submit SHALL disabled atau menampilkan error saat diklik

### Unchanged Behavior (Regression Prevention)

3.1 WHEN semua field valid (nama terisi, email format benar, semua NIK 16 digit dan unik) THEN sistem SHALL CONTINUE TO memanggil `submitBookingUseCase` dan redirect ke `/orders/{bookingId}/pay` setelah berhasil

3.2 WHEN API call `submitBookingUseCase` gagal THEN sistem SHALL CONTINUE TO menampilkan error message dari response API

3.3 WHEN countdown timer habis THEN tombol submit SHALL CONTINUE TO disabled

3.4 WHEN tidak ada tiket yang dipilih (count === 0) THEN tombol submit SHALL CONTINUE TO disabled

3.5 WHEN proses submit sedang berjalan (submitting === true) THEN tombol submit SHALL CONTINUE TO disabled dengan loading indicator

3.6 WHEN user mengisi NIK valid dan terverifikasi Dukcapil THEN sistem SHALL CONTINUE TO menampilkan success message dengan nama pemilik NIK

3.7 WHEN NIK sudah digunakan atau tidak ditemukan di Dukcapil THEN sistem SHALL CONTINUE TO menampilkan pesan error yang sesuai dari hasil validasi
