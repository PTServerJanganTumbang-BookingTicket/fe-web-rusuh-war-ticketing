# Architecture Decision Record: Design System Selection

## ADR-0017: Pemilihan Design System untuk Aplikasi Greenfield

**Status:** Proposed  
**Date:** 2025-01-XX  
**Decision Makers:** [Team Name]  
**Technical Story:** Pemilihan design system yang optimal untuk pengembangan aplikasi baru dengan requirement mengikuti branding Signal/Telkomsel

---

## Context

Tim akan mengembangkan aplikasi greenfield yang **wajib** mengikuti branding Signal/Telkomsel. Terdapat tiga opsi design system yang dipertimbangkan:

1. **Signal UI React** — Design system internal Telkomsel
2. **Shadcn + Radix UI** — Headless component library dengan Tailwind
3. **TDesign (Tencent)** — Full-featured component library

Dokumen ini menyajikan analisis komprehensif untuk membantu pengambilan keputusan.

---

## Options Analysis

### Option 1: Signal UI React (Existing Internal Design System)

#### Overview
| Attribute | Value |
|-----------|-------|
| Repository | `signal-ui-react` (Internal Telkomsel) |
| Version | 0.0.3 (Beta) |
| React Version | 18.2.0 |
| Styling | SCSS/Sass + CSS Variables |
| Components | 20 komponen (14 Beta, 0 Stable) |
| Documentation | Storybook |

#### Architecture
```
signal-ui-react/
├── lib/
│   ├── components/          # React components
│   │   ├── Button/
│   │   │   ├── index.tsx
│   │   │   └── Button.interface.ts
│   │   ├── Modal/
│   │   └── ... (20 components)
│   └── definitions/         # TypeScript enums & types
│       ├── Color.ts
│       ├── IconName.ts
│       └── Size.ts
├── src/
│   └── styles/              # SCSS stylesheets
│       ├── color.scss       # Design tokens
│       ├── button.scss
│       └── ... (per-component styles)
└── package.json
```

#### Design Tokens
```scss
// Semantic Color System (10 levels per category)
$semantics-color: (
  primary:   (#fff5f6 → #66000f),   // Telkomsel Red
  secondary: (#fcfdfd → #00071f),   // Telkomsel Navy
  valid:     (#f2fdf4 → #00331e),   // Success Green
  info:      (#f7fcff → #001653),   // Info Blue
  warning:   (#fefbf1 → #793408),   // Warning Orange
  error:     (#feefeb → #690739),   // Error Red
  neutral:   (#ffffff → #4e5764),   // Grayscale
);
```

#### Component Maturity Status
| Component | Status | Notes |
|-----------|--------|-------|
| Button | ✅ Beta | 3 variants, 4 colors, 3 sizes |
| Modal | ✅ Beta | Compound pattern (Header/Content/Footer) |
| BottomSheet | ✅ Beta | Mobile-first drawer |
| TextField | ✅ Beta | With validation states |
| TextArea | ✅ Beta | Auto-resize support |
| OTP | ✅ Beta | 4-6 digit input |
| Checkbox | ✅ Beta | Custom icon support |
| Radio | ✅ Beta | Group support |
| Switch/Toggle | ✅ Beta | Basic implementation |
| Tab | ✅ Beta | Horizontal tabs |
| Breadcrumb | ✅ Beta | Basic navigation |
| Badges | ✅ Beta | Status indicators |
| Chips | ✅ Beta | Selectable/Dismissible |
| Snackbar | ✅ Beta | Toast notifications |
| Callout | ✅ Beta | Alert banners |
| Label | ✅ Beta | Form labels |
| Icon | ✅ Beta | Custom icon font (tselIcon) |
| Banner | ❌ Not Started | — |
| Tooltip | ❌ Not Started | — |
| Dialogs | ❌ Not Started | — |
| Select/Dropdown | ❌ Not Available | — |
| Table | ❌ Not Available | — |
| DatePicker | ❌ Not Available | — |
| Pagination | ❌ Not Available | — |

#### Accessibility Audit
| Criteria | Status | Details |
|----------|--------|---------|
| ARIA Labels | ⚠️ Partial | Tidak konsisten di semua komponen |
| Keyboard Navigation | ⚠️ Minimal | Hanya Escape key di Modal |
| Focus Management | ❌ Missing | Tidak ada focus trap di Modal |
| Screen Reader | ❌ Missing | Tidak ada live regions |
| Color Contrast | ✅ Good | Mengikuti WCAG AA |
| Focus Indicators | ⚠️ Partial | Tidak semua komponen |

#### Pros
- ✅ **Zero setup** — Branding Telkomsel sudah terintegrasi
- ✅ **Konsisten** dengan aplikasi Telkomsel lainnya
- ✅ **Internal support** dari tim Signal
- ✅ **TypeScript** dengan interface definitions
- ✅ **Compound component pattern** pada Modal

#### Cons
- ❌ **Beta status** — Belum production-ready
- ❌ **Limited components** — 20 komponen, banyak yang belum tersedia
- ❌ **Poor accessibility** — Tidak WAI-ARIA compliant
- ❌ **SCSS coupling** — Sulit diintegrasikan dengan Tailwind ecosystem
- ❌ **Internal state management** — Konflik potensial dengan form libraries
- ❌ **No headless option** — Styling tightly coupled dengan logic

---

### Option 2: Shadcn/UI + Radix UI (Headless + Tailwind)

#### Overview
| Attribute | Value |
|-----------|-------|
| Repository | github.com/shadcn-ui/ui |
| Architecture | Copy-paste to repo (full ownership) |
| React Version | 18.x, 19.x compatible |
| Styling | Tailwind CSS + CSS Variables |
| Components | 50+ komponen |
| Primitives | Radix UI (headless) |
| Documentation | shadcn.com (comprehensive) |

#### Architecture
```
project/
├── components/
│   └── ui/                  # Shadcn components (owned by you)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       └── ... (copy-paste, full control)
├── lib/
│   └── utils.ts             # cn() helper
├── styles/
│   └── globals.css          # CSS Variables (design tokens)
├── tailwind.config.ts       # Tailwind + Signal colors
└── components.json          # Shadcn CLI config
```

#### Integration with Signal Branding
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Signal Design Tokens
        primary: {
          DEFAULT: '#ff0025',
          0: '#fff5f6', 1: '#ffebee', 2: '#ffccd3',
          3: '#ff99a8', 4: '#ff3351', 5: '#ff0025',
          6: '#e50021', 7: '#c2001c', 8: '#940015', 9: '#66000f',
        },
        secondary: {
          DEFAULT: '#001a41',
          0: '#fcfdfd', 1: '#f9f9fa', 2: '#f1f1f4',
          3: '#dfe2e7', 4: '#b3bac6', 5: '#8c99ac',
          6: '#334867', 7: '#001a41', 8: '#000e2e', 9: '#00071f',
        },
        // valid, info, warning, error, neutral...
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        'signal': '9999px', // Signal button radius
      },
    },
  },
}
```

#### Component Availability
| Category | Components |
|----------|------------|
| **Forms** | Button, Input, Textarea, Checkbox, Radio, Switch, Select, Combobox, Slider, DatePicker, Form |
| **Overlay** | Dialog, Sheet, Drawer, Popover, Tooltip, HoverCard, ContextMenu, DropdownMenu, AlertDialog |
| **Data Display** | Table, DataTable, Card, Avatar, Badge, Calendar |
| **Navigation** | Tabs, Breadcrumb, Pagination, NavigationMenu, Menubar |
| **Feedback** | Toast, Sonner, Alert, Progress, Skeleton |
| **Layout** | Accordion, Collapsible, Separator, AspectRatio, ScrollArea, Resizable |

#### Accessibility Features (via Radix)
| Criteria | Status | Details |
|----------|--------|---------|
| ARIA Labels | ✅ Complete | All components WAI-ARIA compliant |
| Keyboard Navigation | ✅ Complete | Full keyboard support |
| Focus Management | ✅ Complete | Focus trap, focus return |
| Screen Reader | ✅ Complete | Live regions, announcements |
| Color Contrast | ✅ Configurable | Via Tailwind tokens |
| Focus Indicators | ✅ Complete | Built-in focus-visible |

#### Pros
- ✅ **Full ownership** — Kode di repo Anda, bebas modifikasi
- ✅ **WAI-ARIA compliant** — Aksesibilitas production-grade
- ✅ **50+ components** — Komprehensif, termasuk yang Signal tidak punya
- ✅ **React 19 ready** — Future-proof
- ✅ **Tailwind native** — Industri standard, mudah di-maintain
- ✅ **Excellent DX** — Debugging dengan visible classes
- ✅ **Huge community** — Banyak resources dan support
- ✅ **Tree-shakeable** — Bundle size optimal

#### Cons
- ❌ **Initial setup effort** — Perlu theme ulang untuk Signal branding (~2 minggu)
- ❌ **Team learning curve** — Jika tim belum familiar Tailwind
- ❌ **Maintenance responsibility** — Anda yang update, bukan tim Signal
- ❌ **Potential inconsistency** — Dengan aplikasi Telkomsel lain yang pakai Signal UI

---

### Option 3: TDesign (Tencent Design System)

#### Overview
| Attribute | Value |
|-----------|-------|
| Repository | github.com/Tencent/tdesign-react |
| Architecture | Full component library (npm install) |
| React Version | 18.x (React 19 compatibility uncertain) |
| Styling | CSS/Less + CSS Variables |
| Components | 80+ komponen |
| Documentation | tdesign.tencent.com (bilingual, Mandarin dominant) |

#### Architecture
```
project/
├── node_modules/
│   └── tdesign-react/       # External dependency
├── src/
│   └── styles/
│       └── tdesign-override.less  # Custom overrides
└── package.json
```

#### Signal Branding Integration
```less
// tdesign-override.less
@brand-color: #ff0025;           // Signal Primary
@brand-color-light: #fff5f6;
@brand-color-dark: #c2001c;

// Requires extensive overrides for full Signal compliance
// TDesign default: Blue theme
// Signal requirement: Red theme + custom tokens
```

#### Pros
- ✅ **80+ components** — Paling lengkap dari ketiga opsi
- ✅ **Production-ready** — Used by Tencent at scale
- ✅ **Good accessibility** — Above average (not Radix-level)
- ✅ **Enterprise features** — Table, TreeSelect, Transfer, etc.

#### Cons
- ❌ **Massive override effort** — Mengubah ke Signal branding sangat kompleks
- ❌ **CSS/Less based** — Tidak native Tailwind
- ❌ **Large bundle size** — Full library included
- ❌ **Documentation** — Dominan Mandarin, community kecil di luar China
- ❌ **React 19 uncertain** — Belum confirmed compatibility
- ❌ **Styling conflicts** — TDesign opinionated, Signal opinionated

---

## Comparison Matrix

### Effort & Timeline Comparison

| Criteria | Signal UI React | Shadcn + Signal Theme | TDesign + Signal Theme |
|----------|----------------|----------------------|------------------------|
| **Initial Setup** | 1-2 hari | 10-14 hari | 30-60 hari |
| **Learning Curve** | Low (internal docs) | Medium (Tailwind) | High (Chinese docs) |
| **Theming Effort** | None | Medium | Very High |
| **Missing Components** | Build from scratch | Already available | Override existing |

### Technical Comparison

| Criteria | Signal UI React | Shadcn + Radix UI | TDesign |
|----------|----------------|-------------------|---------|
| **React Version** | 18.2 (fixed) | 18.x, 19.x | 18.x |
| **TypeScript** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Styling System** | SCSS + CSS Vars | Tailwind + CSS Vars | Less + CSS Vars |
| **Bundle Strategy** | Tree-shakeable | Tree-shakeable | Partial |
| **SSR Support** | Not tested | ✅ Full (Next.js) | ✅ Full |

### Component Availability

| Component Category | Signal UI | Shadcn | TDesign |
|-------------------|-----------|--------|---------|
| Basic (Button, Input) | ✅ 14 | ✅ 15 | ✅ 20 |
| Form Controls | ✅ 8 | ✅ 15 | ✅ 25 |
| Overlay (Modal, Drawer) | ✅ 3 | ✅ 10 | ✅ 12 |
| Data Display (Table) | ❌ 0 | ✅ 5 | ✅ 15 |
| Navigation | ✅ 2 | ✅ 6 | ✅ 10 |
| Feedback | ✅ 3 | ✅ 6 | ✅ 8 |
| **Total** | **~20** | **~50** | **~80** |

### Quality Attributes

| Attribute | Signal UI | Shadcn + Radix | TDesign |
|-----------|-----------|----------------|---------|
| **Accessibility (a11y)** | ⭐⭐ Poor | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |
| **Customization** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Limited |
| **Maintainability** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Limited |
| **Developer Experience** | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |
| **Documentation** | ⭐⭐⭐ Storybook | ⭐⭐⭐⭐⭐ Comprehensive | ⭐⭐ Mandarin-heavy |
| **Community Support** | ⭐ Internal only | ⭐⭐⭐⭐⭐ Massive | ⭐⭐ China-focused |
| **Long-term Viability** | ⭐⭐ Uncertain | ⭐⭐⭐⭐⭐ Very High | ⭐⭐⭐ Medium |

---

## Decision Matrix

### Scoring (1-5, higher = better)

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

---

## Recommendation

### Primary Recommendation: **Shadcn + Radix UI dengan Signal Theme**

**Rationale:**
1. **Best long-term investment** — Higher initial effort, significantly lower maintenance cost
2. **Accessibility compliance** — Critical untuk enterprise applications
3. **Component completeness** — Tidak perlu build dari scratch untuk Table, DatePicker, dll
4. **Industry standard** — Tailwind adoption mempermudah hiring dan onboarding
5. **Full ownership** — Tidak dependent pada tim Signal untuk updates

### Implementation Roadmap

```
Week 1: Foundation Setup
├── Day 1-2: Project scaffolding (Vite + React + TypeScript)
├── Day 3-4: Tailwind config dengan Signal design tokens
└── Day 5: Shadcn CLI setup + base components

Week 2: Core Components Theming
├── Day 1-2: Button, Input, Textarea (Signal styling)
├── Day 3-4: Checkbox, Radio, Switch, Select
└── Day 5: Form validation integration

Week 3: Overlay & Feedback
├── Day 1-2: Dialog/Modal (Signal Header/Content/Footer pattern)
├── Day 3: BottomSheet/Drawer
├── Day 4: Toast/Snackbar
└── Day 5: Testing & refinement

Week 4: Advanced Components
├── Day 1-2: Table dengan Signal styling
├── Day 3: DatePicker, Pagination
├── Day 4: Documentation (Storybook)
└── Day 5: Final review & handoff
```

### Alternative Recommendation: **Signal UI React**

**When to choose Signal UI directly:**
- Project duration < 3 bulan
- Tidak membutuhkan komponen kompleks (Table, DatePicker)
- Aksesibilitas bukan requirement utama
- Tim sudah familiar dengan Signal UI
- Konsistensi dengan aplikasi Telkomsel existing lebih penting

---

## Consequences

### If choosing Shadcn + Signal Theme:

**Positive:**
- Full control over component behavior dan styling
- Production-grade accessibility out of the box
- Tidak blocked oleh tim Signal untuk fitur baru
- Lebih mudah di-maintain oleh any frontend developer

**Negative:**
- 2 minggu initial investment
- Potential visual inconsistency dengan aplikasi Telkomsel lain
- Tim perlu familiar dengan Tailwind

**Mitigation:**
- Buat design token documentation yang align dengan Signal
- Regular sync dengan tim Signal untuk branding updates
- Tailwind training untuk tim jika diperlukan

### If choosing Signal UI React:

**Positive:**
- Fastest time to first component
- Guaranteed branding consistency
- Support dari tim internal

**Negative:**
- Blocked untuk komponen yang belum ada
- Technical debt dari poor accessibility
- Dependent pada tim Signal untuk bug fixes

**Mitigation:**
- Build custom components untuk yang tidak tersedia
- Plan accessibility improvements sebagai tech debt
- Establish SLA dengan tim Signal

---

## References

- [Signal UI React Repository](https://cicd-gitlab-ee.telkomsel.co.id/signal/signal-ui-react/)
- [Signal UI Storybook](https://10.49.141.141/signal-storybook/)
- [Shadcn/UI Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [TDesign React](https://tdesign.tencent.com/react/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

## Decision

**Selected Option:** [To be filled after team discussion]

**Date:** [To be filled]

**Approved By:** [To be filled]

---

*Document Version: 1.0*  
*Last Updated: 2025-01-XX*
