import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/core/views/ScreenLoading";

export default function BookingLayout({ children }: LayoutProps<"/events/[eventId]/book">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
