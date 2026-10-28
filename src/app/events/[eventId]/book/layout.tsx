import { Suspense } from "react";
import { AppProviders } from "@/di/AppProviders";
import { ScreenLoading } from "@/ui/ScreenLoading";

export default function BookingLayout({ children }: LayoutProps<"/events/[eventId]/book">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
