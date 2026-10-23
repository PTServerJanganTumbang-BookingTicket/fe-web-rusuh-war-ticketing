// Home. Requirement: FR-01–05. Wireframe 9.1. ADR-0007 (static + ISR), ADR-0017 (screen model).
import { HomeView } from "@rusuh/ui";
import { loadHome } from "./loadHome";
import { toHomeViewProps } from "./toHomeViewProps";

// Home adalah Server Component statis, jadi tidak memakai hook ViewModel (ADR-0003, ADR-0007).
export async function HomeContainer() {
  return <HomeView {...toHomeViewProps(await loadHome())} />;
}
