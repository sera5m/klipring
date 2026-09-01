import { createFileRoute } from "@tanstack/react-router";
import { PlasmaDesktop } from "@/components/desktop/PlasmaDesktop";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <PlasmaDesktop />;
}
