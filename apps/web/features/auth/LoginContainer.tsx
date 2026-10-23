"use client";

import { LoginView } from "@rusuh/ui";
import { toLoginViewProps } from "./toLoginViewProps";
import { useLoginViewModel } from "./useLoginViewModel";

export function LoginContainer({ returnTo, reason }: { returnTo: string | null; reason: string | null }) {
  return <LoginView {...toLoginViewProps(useLoginViewModel({ returnTo, reason }))} />;
}
