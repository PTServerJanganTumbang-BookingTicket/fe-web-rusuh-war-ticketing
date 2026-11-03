import Link from "next/link";
import { ScreenFrame } from "@/components/ui/layout/ScreenFrame";
import { Alert, Button } from "@/components/ui/primitives";

export type VerifyLoginViewProps = {
  title: string;
  message: string;
  error?: string;
  /** Tombol masuk. Token baru dipakai saat ditekan, supaya pemindai email tidak menghanguskannya (ADR-0023 usulan 2). */
  confirm?: { label: string; disabled: boolean; onClick: () => void };
  requestNew?: { label: string; href: string };
};

export function VerifyLoginView({ title, message, error, confirm, requestNew }: VerifyLoginViewProps) {
  return (
    <ScreenFrame title={title}>
      {error ? (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      ) : (
        <p className="type-body1" role="status">
          {message}
        </p>
      )}
      {confirm ? (
        <Button size="lg" disabled={confirm.disabled} onClick={confirm.onClick}>
          {confirm.label}
        </Button>
      ) : null}
      {requestNew ? (
        <Button asChild variant="outline" size="lg">
          <Link href={requestNew.href}>{requestNew.label}</Link>
        </Button>
      ) : null}
    </ScreenFrame>
  );
}
