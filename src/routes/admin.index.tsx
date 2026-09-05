import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { ClientsTable } from "@/components/ClientsTable";
import { profileCompletion, type ProfileRow } from "@/lib/constants";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Panel del entrenador — Vanta" },
      { name: "description", content: "Resumen de clientes, altas recientes y perfiles pendientes." },
      { property: "og:title", content: "Panel del entrenador — Vanta" },
      {
        property: "og:description",
        content: "Resumen de clientes, altas recientes y perfiles pendientes.",
      },
    ],
  }),
});

function AdminDashboard() {
  const { data: clients } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const list = clients ?? [];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = list.filter((c) => new Date(c.created_at).getTime() > weekAgo);
  const incomplete = list.filter((c) => profileCompletion(c) < 100);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-card-foreground">Mis clientes</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Panel del entrenador · {list.length} fichas
          </p>
        </div>
        <Link to="/admin/clients" className="text-xs font-medium text-primary hover:underline">
          Ver todos
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Clientes totales" value={list.length} />
        <StatCard label="Activos" value={list.filter((c) => c.is_active).length} highlight />
        <StatCard label="Recientes" value={recent.length} />
        <StatCard label="Perfiles incompletos" value={incomplete.length} />
      </div>

      <div className="mt-6">
        <ClientsTable clients={list.slice(0, 8)} />
      </div>
    </>
  );
}
