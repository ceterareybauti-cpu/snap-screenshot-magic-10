import { Link } from "@tanstack/react-router";
import { PersonAvatar } from "@/components/PersonAvatar";
import { profileCompletion, type ProfileRow } from "@/lib/constants";

export function ClientsTable({ clients }: { clients: ProfileRow[] }) {
  if (!clients.length) {
    return (
      <p className="rounded-2xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground ring-1 ring-border">
        Todavía no hay clientes registrados.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-border">
      <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:grid-cols-[1.8fr_1.2fr_0.9fr_0.9fr_1fr]">
        <span>Cliente</span>
        <span className="hidden sm:block">Objetivo</span>
        <span>Peso / Alt</span>
        <span className="hidden sm:block">Exp</span>
        <span className="text-right">Perfil</span>
      </div>
      <div className="divide-y divide-border">
        {clients.map((client) => {
          const completion = profileCompletion(client);
          return (
            <Link
              key={client.id}
              to="/admin/clients/$clientId"
              params={{ clientId: client.id }}
              className="grid grid-cols-[1.6fr_1fr_1fr] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[1.8fr_1.2fr_0.9fr_0.9fr_1fr]"
            >
              <div className="flex items-center gap-3">
                <PersonAvatar path={client.avatar_url} name={client.full_name} className="size-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {client.full_name ?? "Sin nombre"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{client.experience ?? "—"}</p>
                </div>
              </div>
              <span className="hidden text-xs text-foreground sm:block">{client.goal ?? "—"}</span>
              <span className="text-xs text-foreground">
                {client.weight_kg ?? "—"} / {client.height_cm ?? "—"}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {client.is_active ? "Activo" : "Inactivo"}
              </span>
              <span className="flex items-center justify-end gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-background">
                  <span
                    className="block h-1.5 rounded-full bg-primary"
                    style={{ width: `${completion}%` }}
                  />
                </span>
                <span className="w-9 text-right text-xs font-medium text-primary">
                  {completion}%
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
