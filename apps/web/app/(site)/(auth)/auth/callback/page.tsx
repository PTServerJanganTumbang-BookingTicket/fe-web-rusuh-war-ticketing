import { Suspense } from "react";
import { AuthCallbackContainer } from "@/features/auth/AuthCallbackContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function AuthCallbackPage({ searchParams }: PageProps<"/auth/callback">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AuthCallback searchParams={searchParams} />
    </Suspense>
  );
}

async function AuthCallback({ searchParams }: Pick<PageProps<"/auth/callback">, "searchParams">) {
  const { token, returnTo } = await searchParams;
  return <AuthCallbackContainer token={typeof token === "string" ? token : null} returnTo={typeof returnTo === "string" ? returnTo : null} />;
}
