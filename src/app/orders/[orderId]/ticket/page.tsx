import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

type Props = PageProps<"/orders/[orderId]/ticket">;

// `orderId` adalah `booking_id`. Kontrak menghapus GET /bookings/{id}/tickets; e-tiket per kursi dibuka lewat
// `eticket_url` di detail booking (§4.4), yang ditampilkan halaman hasil pembayaran. Layout memasang AppProviders.
export default function OrderTicketPage({ params }: Props) {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="ticket" />}>
      <ToOrderResult params={params} />
    </Suspense>
  );
}

async function ToOrderResult({ params }: Pick<Props, "params">): Promise<never> {
  const { orderId } = await params;
  redirect(`/orders/${encodeURIComponent(orderId)}/pay`);
}
