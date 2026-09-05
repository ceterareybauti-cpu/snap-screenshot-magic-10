import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Vanta — Entrenamiento personal" },
      {
        name: "description",
        content: "Accede a tus programas de entrenamiento personalizados y a tu perfil.",
      },
      { property: "og:title", content: "Vanta — Entrenamiento personal" },
      {
        property: "og:description",
        content: "Accede a tus programas de entrenamiento personalizados y a tu perfil.",
      },
    ],
  }),
});

function Index() {
  const { loading, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/auth", replace: true });
    } else if (role === "admin") {
      void navigate({ to: "/admin", replace: true });
    } else {
      void navigate({ to: "/home", replace: true });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="label-eyebrow">Cargando…</p>
    </div>
  );
}
