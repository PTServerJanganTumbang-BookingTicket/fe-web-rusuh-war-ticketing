import {
  endSession,
  redeemLoginLink as redeemLoginLinkPort,
  registerAccount as registerAccountPort,
  sendLoginLink,
  sendVerificationEmail,
  startPayment,
  startSession,
  verifyEmail as verifyEmailPort,
} from "@rusuh/api";
import {
  enterBookingRoom,
  logout,
  payOrder,
  redeemLoginLink,
  registerAccount,
  requestLoginLink,
  verifyEmail,
  type Order,
  type PaymentMethod,
  type QueueState,
  type RegistrationInput,
} from "@rusuh/core";

/**
 * Composition root: satu-satunya tempat port use case di `core` disambungkan ke adapter `api` (ADR-0015).
 * Manual dan eksplisit, tanpa container DI. ViewModel memanggil `application.*`, bukan adapter command secara langsung
 * (ditegakkan ESLint). Query (baca) tetap lewat query options di `api` (ADR-0004).
 */
export const application = {
  enterBookingRoom: (queue: QueueState) => enterBookingRoom({ startSession }, queue),
  payOrder: (order: Order, method: PaymentMethod) => payOrder({ startPayment }, order, method),
  requestLoginLink: (email: string, returnTo: string | null) => requestLoginLink({ sendLoginLink }, email, returnTo),
  redeemLoginLink: (token: string | null, returnTo: string | null) => redeemLoginLink({ redeemLoginLink: redeemLoginLinkPort }, token, returnTo),
  logout: () => logout({ endSession }),
  registerAccount: (input: RegistrationInput) => registerAccount({ registerAccount: registerAccountPort }, input),
  // Tanpa use case: tidak ada aturan selain memanggil BE dengan email yang sudah divalidasi ViewModel lewat core.
  resendVerificationEmail: (email: string) => sendVerificationEmail(email),
  verifyEmail: (token: string | null) => verifyEmail({ verifyEmail: verifyEmailPort }, token),
};
