import type { QueueState } from "@rusuh/core";
import type { QueueResponseDto } from "../contracts/queue";

export function toQueueState(dto: QueueResponseDto): QueueState {
  if (dto.status === "admitted") {
    return { status: "admitted", eventName: dto.eventName, accessToken: dto.accessToken, expiresAt: dto.expiresAt };
  }
  return {
    status: "waiting",
    eventName: dto.eventName,
    position: dto.position,
    joinedPosition: dto.joinedPosition,
    etaSeconds: dto.etaSeconds,
    // BE memakai detik (selaras header Retry-After), domain memakai ms.
    retryAfterMs: dto.retryAfterSeconds * 1000,
  };
}
