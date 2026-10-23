import type { BookingSession } from "@rusuh/core";
import type { BookingSessionResponseDto } from "../contracts/booking";

export function toBookingSession(dto: BookingSessionResponseDto): BookingSession {
  return {
    eventName: dto.eventName,
    expiresAt: dto.expiresAt,
    serverNow: dto.serverNow,
    maskedNik: dto.maskedNik,
    quota: { max: dto.quota.max, used: dto.quota.used, remaining: dto.quota.remaining },
    categories: dto.categories.map((category) => ({
      id: category.id,
      name: category.name,
      priceIdr: category.priceIdr,
      stock: category.stock,
    })),
  };
}
