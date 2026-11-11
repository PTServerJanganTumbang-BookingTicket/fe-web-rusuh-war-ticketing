"use client";

import "./globals.css";
import { ErrorScreen } from "@/components/ui/layout/ErrorScreen";
import { Button } from "@/components/ui/button";
import { t } from "@/core/i18n/t.utils";

/** Error di root layout. Mengganti layout, jadi mendefinisikan `<html>` dan `<body>` sendiri. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ErrorScreen
          illustration="error"
          title={t("error.boundary.title")}
          description={t("error.boundary.description")}
        >
          <Button size="lg" onClick={() => retry()}>
            {t("error.boundary.retry")}
          </Button>
        </ErrorScreen>
      </body>
    </html>
  );
}
