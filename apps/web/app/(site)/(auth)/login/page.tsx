import { Suspense } from "react";
import { LoginContainer } from "@/features/auth/LoginContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { returnTo, reason } = await searchParams;
  return <LoginContainer returnTo={typeof returnTo === "string" ? returnTo : null} reason={typeof reason === "string" ? reason : null} />;
}
