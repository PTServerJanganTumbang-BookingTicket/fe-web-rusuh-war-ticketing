# ADR-0022: Payment UI — Composable Instruction Renderer

- **Status**: Accepted
- **Tanggal**: 2026-10-27
- **Pengambil keputusan**: Tim FE Web
- **Requirement terkait**: FR-20, FR-21, FR-24, ADR-0006, ADR-0008, ADR-0012 (Signal DS)

## Konteks

ADR-0006 memutuskan: tidak ada Snap/redirect Midtrans, BE yang memanggil Core API, FE membangun UI instruksi pembayaran sendiri ("headless at gateway level"). Keputusan itu tetap berlaku.

Yang belum diputuskan adalah **bagaimana FE mengorganisir komponen UI untuk setiap instruction type** agar:

1. Mudah mengikuti Signal DS (ADR-0012) — setiap metode boleh punya layout berbeda (VA = nomor + tombol salin; GoPay = QR di desktop, deeplink button di mobile/WebView)
2. Controller tetap agnostik terhadap UI — `usePaymentController` tidak perlu berubah saat ada metode baru
3. Platform difference (web vs WebView per ADR-0008) ditangani di satu tempat, bukan tersebar

Kondisi saat ini: `toInstructionView` di `payment.mapper.ts` adalah switch statement yang tumbuh linear setiap metode baru ditambahkan. Tidak ada pemisahan antara logika (copy VA number, buka deeplink) dan tampilan (Signal DS component mana yang dipakai).

## Opsi yang dipertimbangkan

### Opsi 1 — Pertahankan switch di mapper

Paling sederhana. Setiap method baru = ubah mapper + view + test mapper sekaligus. Tidak ada kontrak eksplisit antara instruction type dan Signal DS component. Platform difference untuk GoPay (QR vs deeplink) ditangani dengan kondisional di dalam mapper.

**Cocok** sampai 2–3 metode. **Tidak cocok** bila metode bertambah atau platform rules makin kompleks.

### Opsi 2 — Renderer Registry: `PaymentMethod → React Component`

Tiap instruction type punya renderer component sendiri. Registry adalah `Record<PaymentMethod, ComponentType<InstructionRendererProps>>`. Controller hanya meneruskan `instruction` data ke registry; tidak tahu cara rendernya.

```typescript
// payment/views/renderers/renderer.registry.ts
export const instructionRenderers: InstructionRendererRegistry = {
  bank_transfer: BankTransferInstructionView,
  gopay: GoPayInstructionView,
};

// Di PaymentView.tsx
const Renderer = instructionRenderers[instruction.type];
return <Renderer instruction={instruction} onCopy={onCopy} isEmbedded={isEmbedded} />;
```

**Kelebihan**: controller dan mapper tidak berubah saat method baru ditambah; setiap renderer bisa pakai Signal DS component yang paling sesuai; platform logic terlokalisasi di masing-masing renderer.
**Kekurangan**: lebih banyak file; perlu kontrak `InstructionRendererProps` yang stabil.

### Opsi 3 — Headless Hook + Dumb Renderer

Pisahkan behavior (`useBankTransferInstruction`, `useGoPayInstruction`) dari tampilan. Hook berisi logika (clipboard, deeplink URL, platform detection); view hanya menerima props dan render Signal DS components.

**Kelebihan**: behavior bisa ditest tanpa render; paling fleksibel.
**Kekurangan**: overkill untuk 2 metode di POC; menambah lapisan abstraksi yang belum dibutuhkan sekarang.

## Keputusan

**Opsi 2 — Renderer Registry**, dengan konvensi file berikut:

```
payment/
└── views/
    ├── PaymentView.tsx                    ← orchestrator; tidak tahu detail tiap metode
    ├── PaymentResultView.tsx
    └── renderers/
        ├── renderer.registry.ts           ← map PaymentMethod → ComponentType
        ├── BankTransferInstructionView.tsx
        └── GoPayInstructionView.tsx
```

### Kontrak renderer

```typescript
// payment/views/renderers/renderer.registry.ts

import type { ComponentType } from "react";
import type { PaymentInstruction, PaymentMethod } from "../../domain/order.model";

export type InstructionRendererProps = {
  instruction: PaymentInstruction;
  /** Untuk VA: apakah nomor VA sudah disalin */
  copied: boolean;
  /** Untuk VA: callback salin nomor */
  onCopy: (text: string) => void;
  /** true bila dibuka di WebView mobile (ADR-0008); GoPay tampilkan deeplink, bukan QR */
  isEmbedded: boolean;
};

export type InstructionRendererRegistry = {
  [K in PaymentMethod]: ComponentType<InstructionRendererProps>;
};

export const instructionRenderers: InstructionRendererRegistry = {
  bank_transfer: BankTransferInstructionView,
  gopay: GoPayInstructionView,
};
```

### BankTransferInstructionView

Menampilkan nomor VA, bank, dan tombol salin menggunakan `Card`, `Body`, `Button` dari Signal DS:

```typescript
// payment/views/renderers/BankTransferInstructionView.tsx
import { Card, Body, Button } from "@signal-web-ui/react";
import type { InstructionRendererProps } from "./renderer.registry";

export function BankTransferInstructionView({ instruction, copied, onCopy }: InstructionRendererProps) {
  if (instruction.type !== "bank_transfer") return null; // type guard
  return (
    <Card variant="1" shadow="1" rounded="8" backgroundColor="white" fontColor="black">
      <Body size="3" color="secondary-7">{t("payment.va.bank", { bank: instruction.bank.toUpperCase() })}</Body>
      <Body size="1" weight="bold">{instruction.vaNumber}</Body>
      <Button variant="2" color="primary" size="medium" onClick={() => onCopy(instruction.vaNumber)}>
        {copied ? t("payment.va.copied") : t("payment.va.copy")}
      </Button>
    </Card>
  );
}
```

### GoPayInstructionView (platform-aware)

Desktop web menampilkan QR (kompatibel QRIS semua aplikasi). Mobile/WebView menampilkan deeplink button (ADR-0008):

```typescript
// payment/views/renderers/GoPayInstructionView.tsx
import { Card, Body, Button } from "@signal-web-ui/react";
import type { InstructionRendererProps } from "./renderer.registry";

export function GoPayInstructionView({ instruction, isEmbedded }: InstructionRendererProps) {
  if (instruction.type !== "gopay") return null; // type guard

  // WebView embed (ADR-0008): Mobile app menangani deep link di luar WebView
  if (isEmbedded) {
    return (
      <Button variant="1" color="primary" full={true}
        onClick={() => { window.location.href = instruction.deeplinkUrl; }}>
        {t("payment.gopay.open_app")}
      </Button>
    );
  }

  // Desktop web: QR QRIS — customer scan dari app e-wallet manapun
  return (
    <Card variant="1" shadow="1" rounded="8" backgroundColor="white" fontColor="black">
      <Body size="3" color="secondary-7">{t("payment.gopay.scan_hint")}</Body>
      <img src={instruction.qrUrl} alt={t("payment.gopay.qr_alt")} style={{ width: 200, height: 200 }} />
      <Body size="3" color="secondary-7">{t("payment.gopay.qris_note")}</Body>
    </Card>
  );
}
```

### Penggunaan di PaymentView

```typescript
// payment/views/PaymentView.tsx — bagian pending instruction
import { instructionRenderers } from "./renderers/renderer.registry";

// ...di dalam JSX:
const InstructionRenderer = props.instruction
  ? instructionRenderers[props.instruction.type]
  : null;

return InstructionRenderer ? (
  <InstructionRenderer
    instruction={props.instruction}
    copied={props.copied}
    onCopy={props.onCopy}
    isEmbedded={props.isEmbedded}
  />
) : null;
```

### Sumber `isEmbedded`

Flag diset oleh **layout**, bukan oleh user-agent string (fragile dan mudah dipalsukan). Layout `app/(embed)` meneruskannya ke `PaymentContainer` via props:

```typescript
// app/(embed)/m/orders/[bookingId]/pay/layout.tsx
export default function EmbedPayLayout({ children }: { children: React.ReactNode }) {
  // Layout ini hanya ada di route (embed) — tidak ada di route (public)
  return <EmbedPaymentShell isEmbedded={true}>{children}</EmbedPaymentShell>;
}
```

## Konsekuensi

- **Positif**:
  - Menambah metode pembayaran baru = satu file renderer baru + satu baris di registry. Controller dan mapper tidak berubah.
  - Setiap renderer ditest secara terisolasi dengan `@testing-library/react`, tanpa perlu render controller penuh.
  - Platform logic (QR vs deeplink) terlokalisasi di `GoPayInstructionView` — satu tempat, bukan tersebar.
  - Full Signal DS compliance: setiap renderer langsung menggunakan komponen Signal DS, tanpa custom CSS kecuali layout positioning minor.

- **Negatif / biaya**:
  - 3–4 file tambahan dibanding satu switch di mapper.
  - Kontrak `InstructionRendererProps` harus stabil; perubahan berarti update semua renderer sekaligus.

- **Yang harus dijaga**:
  - `PaymentView.tsx` **tidak boleh** berisi `switch` atau `if` atas `instruction.type`. Semua routing ke renderer.
  - Setiap renderer **hanya boleh** mengimport dari `@signal-web-ui/react`, `core/i18n`, dan `payment/domain` (type only). Tidak ada import dari application atau data layer (ADR-0014).
  - `isEmbedded` **harus** datang dari layout props/context, bukan dari `navigator.userAgent` detection.
  - Test renderer: unit test per file renderer dengan `@testing-library/react`, bukan via integration test controller.

## Catatan hubungan dengan ADR lain

| ADR | Hubungan |
|-----|----------|
| ADR-0006 | Keputusan headless di level gateway (Core API, tidak ada Snap) tetap berlaku tanpa perubahan. ADR ini mengatur headless di level komponen FE. |
| ADR-0008 | `isEmbedded` adalah mekanisme resmi untuk membedakan web dari WebView. ADR-0008 bertanggung jawab atas session exchange dan JS bridge; ADR ini bertanggung jawab atas perbedaan UI rendering. |
| ADR-0012 (Signal DS) | Setiap renderer **wajib** menggunakan Signal DS components. Tidak ada custom button, card, atau badge dari primitif sendiri. |
| ADR-0014 (Clean Architecture) | Renderer berada di layer `views/`. Hanya boleh import `components/ui` dan `domain` (type only). |
