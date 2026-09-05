import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { FullScreenLoader, useRequireRole } from "@/hooks/useRequireRole";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { ready } = useRequireRole("admin");
  if (!ready) return <FullScreenLoader />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
