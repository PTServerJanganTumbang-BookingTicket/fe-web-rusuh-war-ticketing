import { Suspense } from "react";
import { AppProviders } from "@/features/shared/AppProviders";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function QueueLayout({ children }: LayoutProps<"/events/[eventId]/queue">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
