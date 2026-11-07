/**
 * @file page.tsx
 * @description Order Ticket Page - Route: /orders/[orderId]/ticket
 *
 * Halaman e-tiket untuk order/booking tertentu.
 * Menggunakan Suspense untuk streaming dan loading state.
 *
 * Note: Route param `orderId` di sini merepresentasikan `bookingId` dalam
 * API contract. Halaman ini menampilkan tiket-tiket yang terkait dengan
 * booking tersebut, atau mengarahkan ke halaman Tiket Saya jika tidak
 * ditemukan data spesifik booking.
 *
 * TODO: Implementasi lengkap memerlukan API endpoint untuk mengambil
 * tiket berdasarkan bookingId. Saat ini redirect ke halaman Tiket Saya.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ScreenLoading } from "@/components/ui/layout/PageSkeleton";
import { t } from "@/core/i18n/t.utils";

/* ========================================================================== */
/*                                   Types                                    */
/* ========================================================================== */

type TicketPageProps = PageProps<"/orders/[orderId]/ticket">;

type TicketContentProps = {
  readonly params: TicketPageProps["params"];
};

/* ========================================================================== */
/*                             Ticket Content                                 */
/* ========================================================================== */

/**
 * Komponen async untuk mengambil params dan menentukan redirect.
 * Dipisah untuk memungkinkan Suspense boundary yang proper.
 *
 * @param params - Route params containing bookingId (as orderId in route)
 *
 * Note: `orderId` route param represents `bookingId` in API contract.
 * Saat ini langsung redirect ke /tickets karena belum ada API endpoint
 * untuk mengambil tiket berdasarkan bookingId tertentu.
 *
 * TODO: Ketika API tersedia, gunakan:
 *   const resolvedParams = await params;
 *   const bookingId = resolvedParams.orderId;
 *   // fetch tiket berdasarkan bookingId
 */
const TicketContent = async ({ params }: TicketContentProps) => {
  // Await params diperlukan untuk Next.js 15+ async params validation
  await params;

  // TODO: Implementasi lengkap - ambil tiket berdasarkan bookingId
  // Saat ini redirect ke halaman Tiket Saya karena belum ada API endpoint
  // untuk mengambil tiket berdasarkan bookingId. User dapat melihat semua
  // tiket mereka di halaman Tiket Saya.
  redirect("/tickets");
};

/* ========================================================================== */
/*                                Page Export                                 */
/* ========================================================================== */

/**
 * Order Ticket Page Component.
 *
 * Route: /orders/[orderId]/ticket
 * Menampilkan e-tiket untuk booking dengan ID tertentu.
 * Note: `orderId` dalam route = `bookingId` dalam API contract.
 *
 * Saat ini redirect ke /tickets (Tiket Saya) karena belum ada
 * API endpoint untuk mengambil tiket berdasarkan bookingId.
 *
 * @param props - Page props dengan dynamic route params
 */
const TicketPage = ({ params }: TicketPageProps) => {
  return (
    <Suspense fallback={<ScreenLoading label={t("common.loading")} variant="ticket" />}>
      <TicketContent params={params} />
    </Suspense>
  );
};

export default TicketPage;
