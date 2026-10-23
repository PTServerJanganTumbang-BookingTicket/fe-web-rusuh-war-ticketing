import { Suspense } from "react";
import { VerifyEmailContainer } from "@/features/auth/VerifyEmailContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function VerifyEmailPage({ searchParams }: PageProps<"/auth/verify-email">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <VerifyEmail searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmail({ searchParams }: Pick<PageProps<"/auth/verify-email">, "searchParams">) {
  const { token } = await searchParams;
  return <VerifyEmailContainer token={typeof token === "string" ? token : null} />;
}
