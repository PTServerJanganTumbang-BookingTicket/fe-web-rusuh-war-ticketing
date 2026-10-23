"use client";

import { RegisterView } from "@rusuh/ui";
import { toRegisterViewProps } from "./toRegisterViewProps";
import { useRegisterViewModel } from "./useRegisterViewModel";

export function RegisterContainer({ step }: { step: string | null }) {
  return <RegisterView {...toRegisterViewProps(useRegisterViewModel({ step }))} />;
}
