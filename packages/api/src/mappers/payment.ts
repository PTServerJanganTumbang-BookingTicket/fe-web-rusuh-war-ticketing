import type { Order, PaymentInstruction, PaymentMethod, PaymentOutcome } from "@rusuh/core";
import type { OrderResponseDto, PaymentInstructionDto, PaymentOutcomeRequestDto, StartPaymentRequestDto } from "../contracts/payment";

function toInstruction(dto: PaymentInstructionDto): PaymentInstruction {
  switch (dto.type) {
    case "virtual_account":
      return { type: "virtual_account", bank: dto.bank, number: dto.number };
    case "qr":
      return { type: "qr", payload: dto.payload };
    case "bank_transfer":
      return { type: "bank_transfer", bank: dto.bank, account: dto.account, accountName: dto.accountName };
  }
}

export function toOrder(dto: OrderResponseDto): Order {
  return {
    orderId: dto.orderId,
    eventName: dto.eventName,
    items: dto.items.map((item) => ({ name: item.name, quantity: item.quantity })),
    totalIdr: dto.totalIdr,
    expiresAt: dto.expiresAt,
    serverNow: dto.serverNow,
    status: dto.status,
    ...(dto.method && { method: dto.method }),
    ...(dto.instruction && { instruction: toInstruction(dto.instruction) }),
  };
}

export function toStartPaymentRequest(method: PaymentMethod): StartPaymentRequestDto {
  return { method };
}

export function toPaymentOutcomeRequest(outcome: PaymentOutcome): PaymentOutcomeRequestDto {
  return { outcome };
}
