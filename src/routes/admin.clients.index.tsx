import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClientsTable } from "@/components/ClientsTable";
import { Input } from "@/components/ui/input";
import type { ProfileRow } from "@/lib/constants";

export const Route = createFileRoute("/admin/clients/")({
  component: AdminClients,
  head: () => ({
    meta: [
      { title: "Clientes — Vanta" },
      { name: "description", content: "Listado completo de clientes y estado de sus perfiles." },
      { property: "og:title", content: "Clientes — Vanta" },
      {
        property: "og:description",
        content: "Listado completo de clientes y estado de sus perfiles.",
      },
    ],
  }),
});

function AdminClients() {
  const [search, setSearch] = useState("");

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

  const filtered = (clients ?? []).filter((client) =>
    (client.full_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <h1 className="font-display text-2xl font-semibold text-card-foreground">Clientes</h1>
        <Input
          placeholder="Buscar por nombre"
          className="w-full max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="mt-6">
        <ClientsTable clients={filtered} />
      </div>
    </>
  );
}
