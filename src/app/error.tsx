"use client";

import Link from "next/link";
import { ErrorScreen } from "@/components/ui/layout/ErrorScreen";
import { Button, buttonVariants } from "@/components/ui/button";
import { t } from "@/core/i18n/t.utils";

export default function ErrorBoundary({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorScreen
      illustration="error"
      title={t("error.boundary.title")}
      description={t("error.boundary.description")}
    >
      <Button size="lg" onClick={() => retry()}>
        {t("error.boundary.retry")}
      </Button>
      <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>
        {t("error.boundary.home")}
      </Link>
    </ErrorScreen>
  );
}
