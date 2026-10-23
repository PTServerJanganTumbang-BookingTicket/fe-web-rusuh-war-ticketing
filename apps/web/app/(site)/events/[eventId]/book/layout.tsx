import { Suspense } from "react";
import { AppProviders } from "@/features/shared/AppProviders";
import { ScreenLoading } from "@/features/shared/ScreenLoading";

export default function BookingLayout({ children }: LayoutProps<"/events/[eventId]/book">) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <AppProviders>{children}</AppProviders>
    </Suspense>
  );
}
