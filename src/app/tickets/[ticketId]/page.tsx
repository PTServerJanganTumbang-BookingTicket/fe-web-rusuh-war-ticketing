import { Suspense } from "react";
import { ETicketContainer } from "@/modules/ticket/views/ETicketContainer";
import { ScreenLoading } from "@/core/views/ScreenLoading";

type Props = PageProps<"/tickets/[ticketId]">;

// Detail tiket: pemilik lewat sesi akun, tautan email lewat `?t=` (FR-26). Layout `/tickets` memasang AppProviders.
export default function TicketDetailPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ScreenLoading />}>
      <TicketDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TicketDetail({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ ticketId }, query] = await Promise.all([params, searchParams]);
  const token = typeof query.t === "string" && query.t !== "" ? query.t : undefined;
  return <ETicketContainer ticketId={ticketId} accessToken={token} />;
}
