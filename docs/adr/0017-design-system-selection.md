# ADR-0017: Pemilihan Shadcn + Radix UI dengan Signal Theme sebagai Design System

- **Status**: Accepted
- **Tanggal**: 2026-10-30
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: NFR-08 (standar development), Telkomsel Signal DS branding requirement

## Konteks

Tim akan mengembangkan aplikasi greenfield yang **wajib** mengikuti branding Signal/Telkomsel. Pemilihan design system harus mempertimbangkan:

- Ketersediaan komponen yang lengkap
- Aksesibilitas (WAI-ARIA compliance)
- Kemudahan maintenance jangka panjang
- Kesesuaian dengan branding Signal/Telkomsel
- Kompatibilitas dengan React 18/19 dan Next.js

Terdapat tiga opsi design system yang dipertimbangkan.

## Opsi yang dipertimbangkan

### 1. Signal UI React (Internal Telkomsel)

| Attribute | Value |
|-----------|-------|
| Version | 0.0.3 (Beta) |
| Components | ~20 komponen (14 Beta, 0 Stable) |
| Styling | SCSS/Sass + CSS Variables |
| Accessibility | ⚠️ Partial — tidak WAI-ARIA compliant |

**Kelebihan:**
- Zero setup untuk branding Telkomsel
- Konsisten dengan aplikasi Telkomsel lain
- Internal support dari tim Signal

**Kekurangan:**
- Beta status, belum production-ready
- Limited components (tidak ada Table, DatePicker, Select)
- Poor accessibility
- SCSS coupling, sulit integrasi dengan Tailwind

### 2. Shadcn + Radix UI (Headless + Tailwind)

| Attribute | Value |
|-----------|-------|
| Components | 50+ komponen |
| Styling | Tailwind CSS + CSS Variables |
| Accessibility | ✅ Complete — WAI-ARIA compliant via Radix |
| React Version | 18.x, 19.x compatible |

**Kelebihan:**
- Full ownership — kode di repo sendiri
- WAI-ARIA compliant (aksesibilitas production-grade)
- 50+ komponen lengkap
- React 19 ready, future-proof
- Tailwind native, industri standard
- Excellent DX dan community support

**Kekurangan:**
- Initial setup effort (~2 minggu untuk Signal theming)
- Maintenance responsibility di tim sendiri
- Potential inconsistency dengan aplikasi Telkomsel lain

### 3. TDesign (Tencent Design System)

| Attribute | Value |
|-----------|-------|
| Components | 80+ komponen |
| Styling | CSS/Less + CSS Variables |
| Accessibility | ⭐⭐⭐ Good (tidak sebaik Radix) |
| Documentation | Dominan Mandarin |

**Kelebihan:**
- 80+ komponen, paling lengkap
- Production-ready, used by Tencent at scale

**Kekurangan:**
- Massive override effort untuk Signal branding
- CSS/Less based, tidak native Tailwind
- Large bundle size
- Dokumentasi dominan Mandarin
- React 19 compatibility uncertain

## Keputusan

**Opsi 2: Shadcn + Radix UI dengan Signal Theme**

### Scoring Decision Matrix

| Factor | Weight | Signal UI | Shadcn + Radix | TDesign |
|--------|--------|-----------|----------------|---------|
| Signal Branding Compliance | 25% | 5 | 4 | 2 |
| Component Completeness | 20% | 2 | 4 | 5 |
| Accessibility | 15% | 2 | 5 | 3 |
| Maintainability | 15% | 3 | 5 | 2 |
| Initial Setup Speed | 10% | 5 | 3 | 1 |
| Community & Documentation | 10% | 2 | 5 | 2 |
| Future-proofing | 5% | 2 | 5 | 3 |
| **Weighted Score** | **100%** | **3.25** | **4.35** | **2.65** |

### Rationale

1. **Best long-term investment** — Higher initial effort, significantly lower maintenance cost
2. **Accessibility compliance** — Critical untuk enterprise applications
3. **Component completeness** — Tidak perlu build dari scratch untuk Table, DatePicker, dll
4. **Industry standard** — Tailwind adoption mempermudah hiring dan onboarding
5. **Full ownership** — Tidak dependent pada tim Signal untuk updates

### Implementasi

Signal branding diimplementasikan melalui:

1. **UI components** di `src/components/ui/`
   - `primitives/` — Shadcn-style components (Button, Badge, Card, dll)
   - `layout/` — App-specific composites (ScreenFrame, CountdownCard)
   - `signal.css` — Token warna Signal
   - `cn.utils.ts` — Class merge utility
2. **Tailwind config** dengan Signal design tokens (`bg-primary`, `bg-signal-bg-error`, dll)
3. **Font** Poppins dan Telkomsel Batik Sans via `next/font`

```
src/components/
└── ui/
    ├── primitives/      ← Button, Badge, Card, Alert, Progress, RadioGroup
    ├── layout/          ← ScreenFrame, CountdownCard, StatusView
    ├── signal.css       ← Token warna Signal
    └── cn.utils.ts
```

Lihat [ADR-0012](0012-signal-ds-tokens-and-primitives.md) untuk detail implementasi token dan primitif.

## Konsekuensi

- **Positif**: Full control over component behavior dan styling. Production-grade accessibility out of the box. Tidak blocked oleh tim Signal untuk fitur baru. Lebih mudah di-maintain oleh any frontend developer. 50+ komponen tersedia tanpa build from scratch.

- **Negatif / biaya**: 2 minggu initial investment untuk setup dan theming. Potential visual inconsistency dengan aplikasi Telkomsel lain. Tim perlu familiar dengan Tailwind.

- **Yang harus dijaga**:
  - ESLint melarang hex di `src/core/views` dan `src/modules/<m>/views`
  - Komponen baru memakai primitif yang ada sebelum membuat gaya sendiri
  - Primitif baru diporting dengan pola yang sama dan varian Signal
  - Regular sync dengan tim Signal untuk branding updates jika ada perubahan

## Referensi

- [Signal UI React Repository](https://cicd-gitlab-ee.telkomsel.co.id/signal/signal-ui-react/)
- [Shadcn/UI Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
