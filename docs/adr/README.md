# Architecture Decision Records

Format ringan berbasis Michael Nygard. Satu keputusan per file, nomor berurutan, tidak pernah dihapus.

| ADR | Judul | Status |
|---|---|---|
| [0001](0001-monorepo-structure.md) | Monorepo dengan pemisahan core / ui / api | Superseded by ADR-0013 |
| [0002](0002-layered-clean-architecture.md) | Lapisan Clean Architecture dan aturan dependensi | Superseded by ADR-0014 |
| [0003](0003-presentation-pattern-viewmodel-hooks.md) | Pola presentasi: ViewModel sebagai custom hook, bukan MVVM berbasis class | Proposed |
| [0004](0004-server-state-tanstack-query.md) | Server state dengan TanStack Query | Proposed |
| [0005](0005-server-authoritative-time.md) | Countdown server-authoritative | Proposed |
| [0006](0006-payment-midtrans-core-api.md) | Payment via Midtrans Core API dengan UI sendiri | Accepted |
| [0007](0007-rendering-strategy.md) | Strategi rendering per halaman | Proposed |
| [0008](0008-webview-payment-embed.md) | Payment page sebagai embed WebView untuk mobile | Proposed |
| [0009](0009-contract-first-openapi-msw.md) | Contract-first dengan OpenAPI dan MSW | Proposed |
| [0010](0010-login-single-session-progress-persistence.md) | Login satu sesi aktif dengan progres yang melekat pada akun | Proposed |
| [0011](0011-nik-linked-to-account.md) | NIK terikat ke akun, terisi otomatis, kuota 3 tiket ditegakkan server | Proposed |
| [0012](0012-signal-ds-tokens-and-primitives.md) | Signal DS lewat preset token dan primitif yang diporting dari repo referensi | Proposed |
| [0013](0013-single-app-modular-structure.md) | Satu aplikasi Next.js dengan modul fitur dan nama file berperan | Proposed |
| [0014](0014-modular-clean-architecture-solid.md) | Clean Architecture per modul: domain, application, data, controllers, views | Proposed |
| [0015](0015-dependency-injection-awilix.md) | Dependency injection dengan Awilix di composition root | Proposed |
| [0016](0016-realtime-updates-sse.md) | Pembaruan antrian dan status pembayaran lewat SSE, polling sebagai cadangan | Proposed |
| [0017](0017-design-system-selection.md) | Pemilihan Shadcn + Radix UI dengan Signal Theme sebagai Design System | Accepted |
| [0018](0018-trunk-based-development.md) | Trunk-Based Development dengan Release Train | Accepted |
| [0019](0019-agent-precommit-validation.md) | Agent Pre-Commit Validation Hook | Accepted |
| [0020](0020-test-file-organization.md) | Unit Test File Organization dalam Folder `__tests__` | Accepted |
| [0021](0021-packaging-single-container-image.md) | Packaging sebagai satu container image | Proposed |
| [0022](0022-payment-instruction-renderer.md) | Payment UI — Composable Instruction Renderer | Accepted |
| [0023](0023-passwordless-login-email.md) | Login magic link mengikuti kontrak API, dengan token disimpan lewat route same-origin | Proposed |
| [0024](0024-shadcn-ui-on-base-ui.md) | Komponen UI baru memakai shadcn/ui gaya `base-mira` di atas Base UI, dengan token Signal | Proposed |
| [0025](0025-authentication-method-comparison.md) | Perbandingan Metode Autentikasi — Magic Link vs OTP vs Password | Proposed |

## Status

- **Proposed**: diusulkan, belum disepakati tim.
- **Accepted**: disepakati, wajib diikuti.
- **Superseded by ADR-XXXX**: diganti keputusan lain. File tetap ada.
- **Rejected**: dipertimbangkan dan ditolak. File tetap ada sebagai jejak.
