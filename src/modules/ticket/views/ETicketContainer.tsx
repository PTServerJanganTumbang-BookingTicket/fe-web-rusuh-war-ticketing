"use client";

import { StatusView } from "@/components/ui/layout/StatusView";
import { useTicketDetailController } from "../controllers/ticket.controller";
import { ETicketView } from "./ETicketView";

export function ETicketContainer({ ticketId, accessToken }: { ticketId: string; accessToken?: string }) {
  const screen = useTicketDetailController(ticketId, accessToken);
  return screen.kind === "ready" ? <ETicketView {...screen.view} /> : <StatusView {...screen.view} />;
}
