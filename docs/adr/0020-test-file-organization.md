# ADR-0020: Unit Test File Organization dalam Folder `__tests__`

- **Status**: Accepted
- **Tanggal**: 2026-10-26
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08 (standar development), ADR-0014 (Clean Architecture)

## Konteks

Proyek ini mengikuti Clean Architecture dengan struktur modular. Sebelumnya, file unit test (`.test.ts`, `.test.tsx`) ditempatkan di sebelah file yang diuji — pattern yang umum disebut "co-location".

Pertimbangan:
- Co-location memudahkan menemukan test untuk file tertentu
- Namun folder menjadi ramai dengan campuran kode produksi dan test
- Tools seperti coverage report lebih mudah dikonfigurasi dengan folder dedicated
- Struktur yang lebih eksplisit membantu onboarding developer baru

## Opsi yang dipertimbangkan

1. **Co-location** (`feature.ts` dan `feature.test.ts` di folder yang sama). Mudah ditemukan, tapi folder menjadi ramai.

2. **Folder `__tests__` per layer** (dipilih). Setiap layer (`domain/`, `application/`, `controllers/`, `data/`) memiliki subfolder `__tests__/`. Test tetap dekat dengan source, tapi dipisahkan secara eksplisit.

3. **Folder `tests/` di root**. Semua test terkumpul di satu tempat, tapi kehilangan konteks modul.

## Keputusan

Opsi 2: Setiap layer dalam modul memiliki folder `__tests__/` sendiri.

### Struktur

```
src/modules/<module>/
├─ domain/
│  ├─ __tests__/
│  │  ├─ <model>.rules.test.ts
│  │  └─ <model>.reducer.test.ts
│  ├─ <model>.model.ts
│  ├─ <model>.rules.ts
│  └─ <model>.reducer.ts
├─ application/
│  ├─ __tests__/
│  │  └─ <verb>-<noun>.use-case.test.ts
│  └─ <verb>-<noun>.use-case.ts
├─ controllers/
│  ├─ __tests__/
│  │  ├─ <module>.controller.test.tsx
│  │  └─ <module>.mapper.test.ts
│  ├─ <module>.controller.ts
│  └─ <module>.mapper.ts
└─ data/
   ├─ __tests__/
   │  └─ http-<service>.service.test.ts
   └─ http-<service>.service.ts
```

### Konvensi Import

Test file di `__tests__/` menggunakan relative import ke parent:

```typescript
// ❌ Sebelumnya (co-location)
import { canAddTicket } from "./can-add-ticket.rules";

// ✅ Sekarang (__tests__/)
import { canAddTicket } from "../can-add-ticket.rules";
```

### Penamaan File

Tidak ada perubahan — test file tetap mengikuti nama source file dengan suffix `.test.ts` atau `.test.tsx`:

| Source | Test |
|--------|------|
| `selection.reducer.ts` | `__tests__/selection.reducer.test.ts` |
| `booking.controller.ts` | `__tests__/booking.controller.test.tsx` |
| `booking.mapper.ts` | `__tests__/booking.mapper.test.ts` |

### Vitest Configuration

Tidak perlu perubahan — Vitest secara default menemukan file `*.test.ts` di manapun.

## Konsekuensi

- **Positif**: 
  - Folder lebih bersih — source dan test terpisah secara visual
  - Struktur eksplisit membantu onboarding
  - Konsisten dengan Jest convention yang sudah familiar banyak developer
  
- **Negatif**: 
  - Perlu navigasi satu level lebih dalam untuk membuka test
  - Import path berubah dari `./` ke `../`
  
- **Yang harus dijaga**:
  - Semua test baru wajib di folder `__tests__/`
  - Jangan mix co-location dan `__tests__/` dalam satu layer
  - Update import path saat memindahkan test ke `__tests__/`

## Migrasi

25 file test dipindahkan dari co-location ke `__tests__/`:

```bash
git mv src/<path>/<file>.test.ts src/<path>/__tests__/<file>.test.ts
# Update imports dari "./" ke "../"
```

Semua 96 test tetap passing setelah migrasi.
