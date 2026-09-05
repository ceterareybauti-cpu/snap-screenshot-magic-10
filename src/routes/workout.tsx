import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Dumbbell, ExternalLink, Play, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole, FullScreenLoader } from "@/hooks/useRequireRole";
import { ClientShell } from "@/components/ClientShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/workout")({
  component: WorkoutPage,
  head: () => ({
    meta: [
      { title: "Entrenamiento — Vanta" },
      { name: "description", content: "Registra tus series y completa tu entrenamiento." },
    ],
  }),
});

type WorkoutExercise = {
  id: string;
  sets: number;
  target_reps: string | null;
  rest_seconds: number | null;
  rir: string | null;
  instructions: string | null;
  position: number;
  exercises: { name: string; primary_muscle: string | null; video_url: string | null } | null;
};

type WorkoutDay = {
  id: string;
  program_id: string;
  name: string;
  focus: string | null;
  is_rest: boolean;
  position: number;
  workout_exercises: WorkoutExercise[];
};

type Program = {
  id: string;
  name: string;
  workout_days: WorkoutDay[];
};

type SetLog = {
  id?: string;
  session_id: string;
  workout_exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rir: number | null;
  completed: boolean;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function WorkoutPage() {
  const { ready, user } = useRequireRole("client");
  const queryClient = useQueryClient();
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState<Record<string, SetLog>>({});

  const { data: program, isLoading } = useQuery({
    queryKey: ["client-workout-program", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_programs")
        .select("id, name, workout_days(id, program_id, name, focus, is_rest, position, workout_exercises(id, sets, target_reps, rest_seconds, rir, instructions, position, exercises(name, primary_muscle, video_url)))")
        .eq("client_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Program | null;
    },
  });

  const days = useMemo(
    () => [...(program?.workout_days ?? [])].sort((a, b) => a.position - b.position),
    [program],
  );

  const activeDay = days.find((day) => day.id === selectedDayId) ?? days.find((day) => !day.is_rest) ?? days[0];

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["workout-session", user?.id, activeDay?.id, todayIso()],
    enabled: !!user && !!activeDay && !activeDay.is_rest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("client_id", user!.id)
        .eq("workout_day_id", activeDay!.id)
        .eq("workout_date", todayIso())
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; completed_at: string | null; notes: string | null } | null;
    },
  });

  const { data: existingLogs } = useQuery({
    queryKey: ["workout-set-logs", session?.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_set_logs")
        .select("*")
        .eq("session_id", session!.id)
        .order("set_number");
      if (error) throw error;
      return data as SetLog[];
    },
  });

  const mergedLogs = useMemo(() => {
    const next = { ...logs };
    for (const log of existingLogs ?? []) next[`${log.workout_exercise_id}-${log.set_number}`] = log;
    return next;
  }, [existingLogs, logs]);

  const startSession = useMutation({
    mutationFn: async () => {
      if (!user || !program || !activeDay) throw new Error("No hay entrenamiento seleccionado");
      const { data, error } = await supabase
        .from("workout_sessions")
        .upsert(
          {
            client_id: user.id,
            program_id: program.id,
            workout_day_id: activeDay.id,
            workout_date: todayIso(),
            notes: notes || null,
          },
          { onConflict: "client_id,workout_day_id,workout_date" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workout-session"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveSet = useMutation({
    mutationFn: async (log: SetLog) => {
      if (!session) throw new Error("Primero inicia el entrenamiento");
      const { data, error } = await supabase
        .from("workout_set_logs")
        .upsert(
          {
            session_id: session.id,
            workout_exercise_id: log.workout_exercise_id,
            set_number: log.set_number,
            weight_kg: log.weight_kg,
            reps: log.reps,
            rir: log.rir,
            completed: log.completed,
          },
          { onConflict: "session_id,workout_exercise_id,set_number" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as SetLog;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["workout-set-logs", session?.id] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const finishSession = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Primero inicia el entrenamiento");
      const { error } = await supabase
        .from("workout_sessions")
        .update({ completed_at: new Date().toISOString(), notes: notes || null })
        .eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrenamiento completado 💪");
      void queryClient.invalidateQueries({ queryKey: ["workout-session"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!ready || isLoading) return <FullScreenLoader />;

  if (!program || !days.length) {
    return (
      <ClientShell>
        <div className="panel-raise p-6 text-center">
          <Dumbbell className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-xl font-semibold text-card-foreground">Sin entrenamiento</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tu entrenador todavía no te asignó un programa.</p>
        </div>
      </ClientShell>
    );
  }

  const exercises = [...(activeDay?.workout_exercises ?? [])].sort((a, b) => a.position - b.position);
  const completedSets = exercises.reduce(
    (total, exercise) => total + Array.from({ length: exercise.sets }, (_, i) => mergedLogs[`${exercise.id}-${i + 1}`]?.completed ? 1 : 0).reduce((a, b) => a + b, 0),
    0,
  );
  const totalSets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  const updateLocal = (exerciseId: string, setNumber: number, patch: Partial<SetLog>) => {
    const key = `${exerciseId}-${setNumber}`;
    setLogs((current) => ({
      ...current,
      [key]: {
        session_id: session?.id ?? "",
        workout_exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: null,
        reps: null,
        rir: null,
        completed: false,
        ...current[key],
        ...patch,
      },
    }));
  };

  return (
    <ClientShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-eyebrow">Entrenamiento</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-card-foreground">Hoy</h1>
        </div>
        <Badge variant={session?.completed_at ? "default" : "secondary"}>
          {session?.completed_at ? "Completado" : `${progress}%`}
        </Badge>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => setSelectedDayId(day.id)}
            className={`min-w-[92px] rounded-xl border px-3 py-2 text-left transition ${activeDay?.id === day.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <span className="block text-xs font-semibold text-foreground">{day.name}</span>
            <span className="mt-1 block text-[10px] text-muted-foreground">{day.is_rest ? "Descanso" : day.focus ?? "Entreno"}</span>
          </button>
        ))}
      </div>

      {activeDay?.is_rest ? (
        <div className="panel-raise mt-4 p-6 text-center">
          <RotateCcw className="mx-auto size-7 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-semibold text-card-foreground">Día de descanso</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recuperá y volvé más fuerte.</p>
        </div>
      ) : (
        <>
          <div className="panel-raise mt-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-eyebrow">Sesión de hoy</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-card-foreground">{activeDay?.name}</h2>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div className="flex items-center justify-end gap-1"><Clock3 className="size-3" /> {totalSets} series</div>
                <div className="mt-1">{completedSets} completadas</div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            {!session ? (
              <Button className="mt-4 w-full" onClick={() => startSession.mutate()} disabled={startSession.isPending || sessionLoading}>
                <Play />
                Comenzar entrenamiento
              </Button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-card-foreground">{exercise.exercises?.name ?? "Ejercicio"}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {exercise.sets} series · {exercise.target_reps ?? "reps libres"} reps
                      {exercise.rir ? ` · RIR ${exercise.rir}` : ""}
                    </p>
                  </div>
                  {exercise.exercises?.video_url ? (
                    <a href={exercise.exercises.video_url} target="_blank" rel="noreferrer" className="text-primary" aria-label="Ver video">
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>

                {exercise.instructions ? <p className="mt-2 rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">{exercise.instructions}</p> : null}

                <div className="mt-3 space-y-2">
                  {Array.from({ length: exercise.sets }, (_, index) => {
                    const setNumber = index + 1;
                    const key = `${exercise.id}-${setNumber}`;
                    const log = mergedLogs[key];
                    return (
                      <div key={key} className={`grid grid-cols-[28px_1fr_1fr_40px] items-center gap-2 rounded-xl border p-2 ${log?.completed ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                        <span className="text-center text-xs font-semibold text-muted-foreground">{setNumber}</span>
                        <Input
                          inputMode="decimal"
                          placeholder="kg"
                          value={log?.weight_kg ?? ""}
                          disabled={!session || !!session.completed_at}
                          onChange={(e) => updateLocal(exercise.id, setNumber, { weight_kg: e.target.value === "" ? null : Number(e.target.value) })}
                          onBlur={() => { if (session && log) saveSet.mutate(log); }}
                        />
                        <Input
                          inputMode="numeric"
                          placeholder="reps"
                          value={log?.reps ?? ""}
                          disabled={!session || !!session.completed_at}
                          onChange={(e) => updateLocal(exercise.id, setNumber, { reps: e.target.value === "" ? null : Number(e.target.value) })}
                          onBlur={() => { if (session && log) saveSet.mutate(log); }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant={log?.completed ? "default" : "outline"}
                          disabled={!session || !!session.completed_at}
                          onClick={() => {
                            const next = { ...(log ?? { session_id: session!.id, workout_exercise_id: exercise.id, set_number: setNumber, weight_kg: null, reps: null, rir: null, completed: false }), completed: !log?.completed };
                            updateLocal(exercise.id, setNumber, next);
                            saveSet.mutate(next);
                          }}
                          aria-label={`Marcar serie ${setNumber}`}
                        >
                          <Check />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {exercise.rest_seconds ? <p className="mt-2 text-[10px] text-muted-foreground">Descanso: {Math.floor(exercise.rest_seconds / 60)}:{String(exercise.rest_seconds % 60).padStart(2, "0")}</p> : null}
              </div>
            ))}
          </div>

          <div className="panel mt-4 p-4">
            <label className="label-eyebrow" htmlFor="workout-notes">Notas de la sesión</label>
            <Textarea id="workout-notes" className="mt-2" placeholder="¿Cómo te sentiste?" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!session || !!session.completed_at} />
            <Button className="mt-3 w-full" disabled={!session || !!session.completed_at || finishSession.isPending || progress < 100} onClick={() => finishSession.mutate()}>
              <Check />
              {progress < 100 ? `Completá todas las series (${completedSets}/${totalSets})` : "Finalizar entrenamiento"}
            </Button>
          </div>
        </>
      )}
    </ClientShell>
  );
}
