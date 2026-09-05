import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole, FullScreenLoader } from "@/hooks/useRequireRole";
import { ClientShell } from "@/components/ClientShell";
import { PersonAvatar } from "@/components/PersonAvatar";
import { profileCompletion, type ProfileRow, WEEK_DAYS } from "@/lib/constants";

export const Route = createFileRoute("/home")({
  component: ClientHome,
  head: () => ({
    meta: [
      { title: "Inicio — Vanta" },
      { name: "description", content: "Tu programa actual y tus días de entrenamiento." },
      { property: "og:title", content: "Inicio — Vanta" },
      {
        property: "og:description",
        content: "Tu programa actual y tus días de entrenamiento.",
      },
    ],
  }),
});

function ClientHome() {
  const { ready, user } = useRequireRole("client");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  const { data: program } = useQuery({
    queryKey: ["client-program", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*, workout_days(*)")
        .eq("client_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as
        | (ProgramSummary & { workout_days: { id: string; name: string; focus: string | null; is_rest: boolean; position: number }[] })
        | null;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ["availability", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_availability")
        .select("day_of_week, is_available, preferred_time")
        .eq("client_id", user!.id)
        .eq("is_available", true);
      if (error) throw error;
      return data as { day_of_week: number; preferred_time: string | null }[];
    },
  });

  if (!ready) return <FullScreenLoader />;

  const completion = profileCompletion(profile);
  const days = [...(program?.workout_days ?? [])].sort((a, b) => a.position - b.position);

  return (
    <ClientShell>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-card-foreground">
            Hola, {profile?.full_name?.split(" ")[0] ?? "atleta"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <PersonAvatar path={profile?.avatar_url} name={profile?.full_name} className="size-11" />
      </div>

      <div className="panel-raise mt-5 p-4">
        <p className="label-eyebrow">Programa actual</p>
        {program ? (
          <>
            <h3 className="mt-2 font-display text-xl font-semibold text-card-foreground">
              {program.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {program.goal ?? program.description ?? "Sin objetivo definido"}
            </p>
            <Link
              to="/program"
              className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Ver programa completo
            </Link>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Todavía no tienes un programa asignado.
          </p>
        )}
      </div>

      <div className="mt-5">
        <p className="label-eyebrow mb-2">Días de entrenamiento</p>
        <div className="divide-y divide-border rounded-2xl bg-muted/40 ring-1 ring-border">
          {days.length ? (
            days.map((day) => (
              <div key={day.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-foreground">{day.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {day.is_rest ? "Descanso" : (day.focus ?? "—")}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin días programados.</p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="label-eyebrow mb-2">Mi disponibilidad</p>
        <div className="panel-raise flex flex-wrap gap-2 p-4">
          {availability?.length ? (
            availability.map((slot) => (
              <span
                key={slot.day_of_week}
                className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
              >
                {WEEK_DAYS.find((d) => d.value === slot.day_of_week)?.label}
                {slot.preferred_time ? ` · ${slot.preferred_time.slice(0, 5)}` : ""}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Sin días marcados todavía.</span>
          )}
        </div>
      </div>

      <div className="panel-raise mt-5 flex items-center justify-between px-4 py-3">
        <div>
          <p className="label-eyebrow">Perfil</p>
          <p className="mt-1 text-sm text-foreground">
            {profile?.weight_kg ? `${profile.weight_kg} kg` : "— kg"} ·{" "}
            {profile?.height_cm ? `${profile.height_cm} cm` : "— cm"} ·{" "}
            {profile?.experience ?? "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Completitud</p>
          <p className="font-display text-sm font-semibold text-primary">{completion}%</p>
        </div>
      </div>
    </ClientShell>
  );
}

type ProgramSummary = {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
};
