import { asClass, asValue, type NameAndRegistrationPair } from "awilix";
import type { AppConfig } from "@/core/application/AppConfig";
import type { CoreDependencies } from "@/core/application/dependencies";
import type { SessionGateway } from "@/core/application/session/SessionGateway";
import { StartSession } from "@/core/application/session/StartSession";
import { FetchHttpClient, type FetchFn } from "@/platform/http/FetchHttpClient";
import type { HttpClient } from "@/platform/http/HttpClient";
import { MathRandomSource } from "@/platform/MathRandomSource";
import { HttpSessionGateway } from "@/platform/session/HttpSessionGateway";
import { EventSourceStreamClient, type EventSourceFactory } from "@/platform/sse/EventSourceStreamClient";
import type { EventStreamClient } from "@/platform/sse/EventStreamClient";
import { SystemClock } from "@/platform/SystemClock";

export type CoreCradle = CoreDependencies & {
  fetchFn: FetchFn;
  httpClient: HttpClient;
  eventSourceFactory: EventSourceFactory;
  eventStreamClient: EventStreamClient;
  sessionGateway: SessionGateway;
};

// `fetch` dibungkus supaya dibaca saat dipanggil: MSW dan test mengganti `globalThis.fetch` setelah container dibuat.
const lateBoundFetch: FetchFn = (input, init) => globalThis.fetch(input, init);

// Hanya dipanggil di browser (effect ViewModel). Server mendaftarkannya juga, tetapi tidak pernah memakainya.
const browserEventSource: EventSourceFactory = (url, init) => new EventSource(url, init);

export function coreModule(appConfig: AppConfig): NameAndRegistrationPair<CoreCradle> {
  return {
    appConfig: asValue(appConfig),
    fetchFn: asValue(lateBoundFetch),
    clock: asClass(SystemClock).singleton(),
    random: asClass(MathRandomSource).singleton(),
    httpClient: asClass(FetchHttpClient).singleton(),
    eventSourceFactory: asValue(browserEventSource),
    eventStreamClient: asClass(EventSourceStreamClient).singleton(),
    sessionGateway: asClass(HttpSessionGateway).singleton(),
    startSession: asClass(StartSession).singleton(),
  };
}
