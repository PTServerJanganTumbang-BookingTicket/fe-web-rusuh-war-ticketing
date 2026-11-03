import { authHandlers } from "./api/auth";
import { bookingHandlers } from "./api/booking";
import { eventHandlers } from "./api/events";
import { paymentHandlers } from "./api/payment";
import { createMockState, type ScenarioConfig } from "./api/state";

export const MOCK_API_BASE_URL = "https://api.rusuh.test";

// Skenario bernama (ADR-0009). Pilih di browser dengan `?scenario=<nama>`.
export type Scenario = "queue-moving" | "queue-stuck" | "booking-expiring" | "payment-expiring";
export const DEFAULT_SCENARIO: Scenario = "queue-moving";

export function isScenario(value: string | null | undefined): value is Scenario {
  return (
    value === "queue-moving" ||
    value === "queue-stuck" ||
    value === "booking-expiring" ||
    value === "payment-expiring"
  );
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  "queue-moving": { servingStep: 416, bookingTtlMs: 5 * 60_000, paymentTtlMs: 10 * 60_000 },
  "queue-stuck": { servingStep: 0, bookingTtlMs: 5 * 60_000, paymentTtlMs: 10 * 60_000 },
  "booking-expiring": { servingStep: 416, bookingTtlMs: 75_000, paymentTtlMs: 10 * 60_000 },
  "payment-expiring": { servingStep: 416, bookingTtlMs: 5 * 60_000, paymentTtlMs: 45_000 },
};

/** Handler MSW sesuai kontrak `src/core/data/http/openapi.json`, dikelompokkan per tag. */
export function createHandlers(scenario: Scenario = DEFAULT_SCENARIO) {
  const state = createMockState(SCENARIOS[scenario]);
  return [
    ...authHandlers(state, MOCK_API_BASE_URL),
    ...eventHandlers(state, MOCK_API_BASE_URL),
    ...bookingHandlers(state, MOCK_API_BASE_URL),
    ...paymentHandlers(state, MOCK_API_BASE_URL),
  ];
}
