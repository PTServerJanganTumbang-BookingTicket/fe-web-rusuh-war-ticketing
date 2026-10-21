import { Suspense } from "react";
import { HomeContainer } from "@/features/catalog/HomeContainer";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function HomePage() {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <HomeContainer />
    </Suspense>
  );
}
