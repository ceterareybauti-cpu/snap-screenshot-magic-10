import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";

/**
 * Client-side routing guard. Server-side access is enforced by database
 * row-level security, this only keeps the UI coherent.
 */
export function useRequireRole(required?: AppRole) {
  const { loading, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    if (required && role && role !== required) {
      void navigate({ to: role === "admin" ? "/admin" : "/home", replace: true });
    }
  }, [loading, user, role, required, navigate]);

  const ready = !loading && !!user && (!required || role === required);
  return { ready, role, user };
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="label-eyebrow">Cargando…</p>
    </div>
  );
}
