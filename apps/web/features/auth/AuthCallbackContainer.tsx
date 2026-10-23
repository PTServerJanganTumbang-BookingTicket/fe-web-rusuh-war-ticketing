"use client";

import { StatusView } from "@rusuh/ui";
import { toAuthCallbackViewProps } from "./toAuthCallbackViewProps";
import { useAuthCallbackViewModel } from "./useAuthCallbackViewModel";

export function AuthCallbackContainer({ token, returnTo }: { token: string | null; returnTo: string | null }) {
  return <StatusView {...toAuthCallbackViewProps(useAuthCallbackViewModel({ token, returnTo }))} />;
}
