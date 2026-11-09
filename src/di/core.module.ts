import { asFunction, asValue, type NameAndRegistrationPair } from "awilix";
import type { AppConfig } from "@/core/domain/app-config.model";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import type { SessionProtocol } from "@/core/domain/session.protocol";
import { createStartSessionUseCase } from "@/core/application/start-session.use-case";
import { createGetSessionAccountUseCase } from "@/core/application/get-session-account.use-case";
import type { SessionAccountProtocol } from "@/core/domain/session-account.protocol";
import { createHttpSessionAccountService } from "@/core/data/account/http-session-account.service";
import { createFetchHttpClient, type FetchFn } from "@/core/data/http/fetch-http.client";
import type { HttpClient } from "@/core/data/http/http.client";
import {
  createAccountGatewayService,
  type AccountGateway,
} from "@/core/data/account/account-gateway.service";
import { createWebStorageCredentialStoreService } from "@/core/data/credentials/web-storage-credential-store.service";
import { createMathRandomService } from "@/core/data/math-random.service";
import { createWebStorageLocalePreferenceService } from "@/core/data/web-storage-locale-preference.service";
import { createHttpSessionService } from "@/core/data/session/http-session.service";
import {
  createEventSourceStreamClient,
  type EventSourceFactory,
} from "@/core/data/sse/event-source-stream.client";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import { createSystemClockService } from "@/core/data/system-clock.service";
import { createTurnstileCaptchaService } from "@/core/data/captcha/turnstile-captcha.service";
import type { CaptchaProtocol } from "@/core/domain/captcha.protocol";

export type CoreRegistry = CoreDependencies & {
  fetchFn: FetchFn;
  httpClient: HttpClient;
  /** Klien ke route same-origin `/api` (token akun di cookie httpOnly, ADR-0023). */
  bffHttpClient: HttpClient;
  accountGateway: AccountGateway;
  eventSourceFactory: EventSourceFactory;
  eventStreamClient: EventStreamClient;
  sessionService: SessionProtocol;
  credentialStore: CredentialStoreProtocol;
  sessionAccountService: SessionAccountProtocol;
  captcha: CaptchaProtocol;
};

// `fetch` dibungkus supaya dibaca saat dipanggil: MSW dan test mengganti `globalThis.fetch` setelah container dibuat.
const lateBoundFetch: FetchFn = (input, init) => globalThis.fetch(input, init);

// Hanya dipanggil di browser (effect controller). Server mendaftarkannya juga, tetapi tidak pernah memakainya.
const browserEventSource: EventSourceFactory = (url, init) => new EventSource(url, init);

export function coreModule(appConfig: AppConfig): NameAndRegistrationPair<CoreRegistry> {
  return {
    appConfig: asValue(appConfig),
    fetchFn: asValue(lateBoundFetch),
    clock: asFunction(createSystemClockService).singleton(),
    random: asFunction(createMathRandomService).singleton(),
    captcha: asFunction(createTurnstileCaptchaService).singleton(),
    localePreference: asFunction(createWebStorageLocalePreferenceService).singleton(),
    httpClient: asFunction(createFetchHttpClient).singleton(),
    bffHttpClient: asFunction(({ appConfig: config, fetchFn }: { appConfig: AppConfig; fetchFn: FetchFn }) =>
      createFetchHttpClient({ appConfig: { ...config, apiBaseUrl: `${config.appBaseUrl}/api` }, fetchFn }),
    ).singleton(),
    // Hanya dipakai route `app/api/auth` dan `app/api/account` di server.
    accountGateway: asFunction(createAccountGatewayService).singleton(),
    eventSourceFactory: asValue(browserEventSource),
    eventStreamClient: asFunction(createEventSourceStreamClient).singleton(),
    credentialStore: asFunction(createWebStorageCredentialStoreService).singleton(),
    sessionService: asFunction(createHttpSessionService).singleton(),
    startSessionUseCase: asFunction(createStartSessionUseCase).singleton(),
    sessionAccountService: asFunction(createHttpSessionAccountService).singleton(),
    getSessionAccountUseCase: asFunction(createGetSessionAccountUseCase).singleton(),
  };
}
