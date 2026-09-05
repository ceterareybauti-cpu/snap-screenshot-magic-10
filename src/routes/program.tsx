import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole, FullScreenLoader } from "@/hooks/useRequireRole";
import { ClientShell } from "@/components/ClientShell";

export const Route = createFileRoute("/program")({
  component: ClientProgram,
  head: () => ({
    meta: [
      { title: "Mi programa — Vanta" },
      { name: "description", content: "Consulta los días y ejercicios de tu programa asignado." },
      { property: "og:title", content: "Mi programa — Vanta" },
      {
        property: "og:description",
        content: "Consulta los días y ejercicios de tu programa asignado.",
      },
    ],
  }),
});

type DayWithExercises = {
  id: string;
  name: string;
  focus: string | null;
  is_rest: boolean;
  position: number;
  workout_exercises: {
    id: string;
    sets: number;
    target_reps: string | null;
    rest_seconds: number | null;
    rir: string | null;
    instructions: string | null;
    position: number;
    exercises: { name: string; primary_muscle: string | null; video_url: string | null } | null;
  }[];
};

function ClientProgram() {
  const { ready, user } = useRequireRole("client");

  const { data: program, isLoading } = useQuery({
    queryKey: ["client-program-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*, workout_days(*, workout_exercises(*, exercises(name, primary_muscle, video_url)))")
        .eq("client_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as
        | { id: string; name: string; goal: string | null; description: string | null; workout_days: DayWithExercises[] }
        | null;
    },
  });

  if (!ready) return <FullScreenLoader />;

  const days = [...(program?.workout_days ?? [])].sort((a, b) => a.position - b.position);

  return (
    <ClientShell>
      <h1 className="font-display text-2xl font-semibold text-card-foreground">Mi programa</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
      ) : !program ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Tu entrenador todavía no te asignó un programa.
        </p>
      ) : (
        <>
          <div className="panel-raise mt-4 p-4">
            <p className="label-eyebrow">{program.goal ?? "Programa"}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-card-foreground">
              {program.name}
            </h2>
            {program.description ? (
              <p className="mt-1 text-xs text-muted-foreground">{program.description}</p>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {days.map((day) => {
              const exercises = [...day.workout_exercises].sort((a, b) => a.position - b.position);
              return (
                <div key={day.id} className="panel p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-base font-semibold text-card-foreground">
                      {day.name}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {day.is_rest ? "Descanso" : (day.focus ?? "")}
                    </span>
                  </div>

                  {!day.is_rest && exercises.length ? (
                    <div className="mt-3 divide-y divide-border">
                      {exercises.map((item) => (
                        <div key={item.id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">
                              {item.exercises?.name ?? "Ejercicio"}
                            </p>
                            <span className="text-[11px] text-primary">
                              {item.sets} × {item.target_reps ?? "—"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Descanso {item.rest_seconds ? `${item.rest_seconds}s` : "—"} · RIR{" "}
                            {item.rir ?? "—"}
                          </p>
                          {item.instructions ? (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.instructions}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : !day.is_rest ? (
                    <p className="mt-2 text-xs text-muted-foreground">Sin ejercicios cargados.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </ClientShell>
  );
}
