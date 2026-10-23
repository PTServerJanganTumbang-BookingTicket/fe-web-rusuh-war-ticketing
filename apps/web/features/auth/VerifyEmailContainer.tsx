"use client";

import { StatusView } from "@rusuh/ui";
import { toVerifyEmailViewProps } from "./toVerifyEmailViewProps";
import { useVerifyEmailViewModel } from "./useVerifyEmailViewModel";

export function VerifyEmailContainer({ token }: { token: string | null }) {
  return <StatusView {...toVerifyEmailViewProps(useVerifyEmailViewModel({ token }))} />;
}
