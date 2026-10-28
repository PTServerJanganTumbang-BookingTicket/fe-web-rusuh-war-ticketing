import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getServerCradle } from "@/di/server";
import { loadHomeViewProps } from "@/modules/catalog/presentation/loadHomeViewProps";
import { HomeView } from "@/modules/catalog/presentation/views/HomeView";
import { ScreenLoading } from "@/ui/ScreenLoading";

async function homeViewProps() {
  "use cache";
  // ISR pendek (ADR-0007). stale ≥ 30 dtk dan expire ≥ 5 mnt agar tetap masuk static shell.
  cacheLife({ stale: 60, revalidate: 15, expire: 600 });
  return loadHomeViewProps(getServerCradle());
}

// Home adalah Server Component statis, jadi tidak memakai hook ViewModel (ADR-0003, ADR-0007).
async function Home() {
  return <HomeView {...await homeViewProps()} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <Home />
    </Suspense>
  );
}
