import { readAppConfig } from "./config";
import { createAppContainer, type AppContainer, type AppCradle } from "./container";

let container: AppContainer | undefined;

/** Container sisi server, satu per proses. Dipakai Server Component di `app/` (mis. Home). */
export function getServerCradle(): AppCradle {
  container ??= createAppContainer(readAppConfig());
  return container.cradle;
}
