import { asClass, asFunction, asValue, type NameAndRegistrationPair } from "awilix";
import type { AppConfig } from "@/core/domain/app-config.model";
import type { CoreDependencies } from "@/core/application/core.dependencies";
import type { SessionProtocol } from "@/core/domain/session.protocol";
import { createStartSessionUseCase } from "@/core/application/start-session.use-case";
import { FetchHttpClient, type FetchFn } from "@/core/data/http/fetch-http.client";
import type { HttpClient } from "@/core/data/http/http.client";
import { createMathRandomService } from "@/core/data/math-random.service";
import { createHttpSessionService } from "@/core/data/session/http-session.service";
import { EventSourceStreamClient, type EventSourceFactory } from "@/core/data/sse/event-source-stream.client";
import type { EventStreamClient } from "@/core/data/sse/event-stream.client";
import { createSystemClockService } from "@/core/data/system-clock.service";

export type CoreRegistry = CoreDependencies & {
  fetchFn: FetchFn;
  httpClient: HttpClient;
  eventSourceFactory: EventSourceFactory;
  eventStreamClient: EventStreamClient;
  sessionService: SessionProtocol;
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
    httpClient: asClass(FetchHttpClient).singleton(),
    eventSourceFactory: asValue(browserEventSource),
    eventStreamClient: asClass(EventSourceStreamClient).singleton(),
    sessionService: asFunction(createHttpSessionService).singleton(),
    startSessionUseCase: asFunction(createStartSessionUseCase).singleton(),
  };
}
