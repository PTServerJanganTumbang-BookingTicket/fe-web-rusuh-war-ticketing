import { Suspense } from "react";
import { RegisterContainer } from "@/features/auth/RegisterContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Register searchParams={searchParams} />
    </Suspense>
  );
}

async function Register({ searchParams }: Pick<PageProps<"/register">, "searchParams">) {
  const { step } = await searchParams;
  return <RegisterContainer step={typeof step === "string" ? step : null} />;
}
