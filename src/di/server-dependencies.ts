import { readAppConfig } from "./app-config.reader";
import { createAppContainer, type AppContainer, type AppRegistry } from "./container";

let container: AppContainer | undefined;

/** Container sisi server, satu per proses. Dipakai Server Component di `app/` (mis. Home). */
export function getServerDependencies(): AppRegistry {
  container ??= createAppContainer(readAppConfig());
  return container.cradle;
}
