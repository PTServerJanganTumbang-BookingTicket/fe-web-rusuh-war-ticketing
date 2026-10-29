import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/core/views/ScreenLoading";

export default function QueueLayout({ children }: LayoutProps<"/events/[eventId]/queue">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
