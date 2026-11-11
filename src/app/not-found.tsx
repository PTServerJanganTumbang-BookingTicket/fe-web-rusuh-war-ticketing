import Link from "next/link";
import { ErrorScreen } from "@/components/ui/layout/ErrorScreen";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/core/i18n/t.utils";

export default function NotFound() {
  return (
    <ErrorScreen
      illustration="box"
      title={t("error.notFound.title")}
      description={t("error.notFound.description")}
    >
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        {t("error.notFound.home")}
      </Link>
    </ErrorScreen>
  );
}
