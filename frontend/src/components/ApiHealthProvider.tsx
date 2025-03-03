"use client";
import { useApiHealth } from "../hooks/useApiHealth";
import MaintenancePage from "./MaintenancePage";

export default function ApiHealthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isApiUp = useApiHealth();

  if (!isApiUp) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
