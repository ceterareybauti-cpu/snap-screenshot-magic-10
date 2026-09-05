import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ProfileRow } from "@/lib/constants";
import type { ExerciseRow } from "./admin.exercises";

export const Route = createFileRoute("/admin/programs/$programId")({
  component: ProgramDetail,
  head: () => ({
    meta: [
      { title: "Editar programa — Vanta" },
      { name: "description", content: "Organiza los días y los ejercicios de este programa." },
      { property: "og:title", content: "Editar programa — Vanta" },
      {
        property: "og:description",
        content: "Organiza los días y los ejercicios de este programa.",
      },
    ],
  }),
});

type Day = {
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
    exercise_id: string;
    exercises: { name: string } | null;
  }[];
};

const emptyItem = {
  exercise_id: "",
  sets: "3",
  target_reps: "10",
  rest_seconds: "90",
  rir: "2",
  instructions: "",
};

function ProgramDetail() {
  const { programId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dayName, setDayName] = useState("");
  const [dayFocus, setDayFocus] = useState("");
  const [itemDayId, setItemDayId] = useState<string | null>(null);
  const [item, setItem] = useState(emptyItem);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["program", programId] }),
      queryClient.invalidateQueries({ queryKey: ["programs"] }),
    ]);

  const { data: program } = useQuery({
    queryKey: ["program", programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_programs")
        .select("*, workout_days(*, workout_exercises(*, exercises(name)))")
        .eq("id", programId)
        .maybeSingle();
      if (error) throw error;
      return data as
        | {
            id: string;
            name: string;
            description: string | null;
            goal: string | null;
            client_id: string | null;
            is_active: boolean;
            workout_days: Day[];
          }
        | null;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data as ExerciseRow[];
    },
  });

  const updateProgram = useMutation({
    mutationFn: async (patch: {
      client_id?: string | null;
      description?: string | null;
      is_active?: boolean;
    }) => {
      const { error } = await supabase.from("workout_programs").update(patch).eq("id", programId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programa actualizado");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addDay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workout_days").insert({
        program_id: programId,
        name: dayName,
        focus: dayFocus || null,
        position: program?.workout_days.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDayName("");
      setDayFocus("");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteDay = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_days").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      const day = program?.workout_days.find((d) => d.id === itemDayId);
      const { error } = await supabase.from("workout_exercises").insert({
        day_id: itemDayId!,
        exercise_id: item.exercise_id,
        sets: Number(item.sets) || 3,
        target_reps: item.target_reps || null,
        rest_seconds: item.rest_seconds ? Number(item.rest_seconds) : null,
        rir: item.rir || null,
        instructions: item.instructions || null,
        position: day?.workout_exercises.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ejercicio añadido");
      setItemDayId(null);
      setItem(emptyItem);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteProgram = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workout_programs").delete().eq("id", programId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programa eliminado");
      void queryClient.invalidateQueries({ queryKey: ["programs"] });
      void navigate({ to: "/admin/programs" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const days = [...(program?.workout_days ?? [])].sort((a, b) => a.position - b.position);

  return (
    <>
      <Link to="/admin/programs" className="text-xs text-muted-foreground hover:text-foreground">
        ← Volver a programas
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-card-foreground">
            {program?.name ?? "Programa"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {program?.goal ?? "Sin objetivo"} · {days.length} días
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => updateProgram.mutate({ is_active: !program?.is_active })}
          >
            {program?.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button variant="outline" onClick={() => deleteProgram.mutate()}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="panel mt-6 grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Cliente asignado</Label>
          <Select
            value={program?.client_id ?? ""}
            onValueChange={(client_id) => updateProgram.mutate({ client_id })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Asignar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name ?? "Sin nombre"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-desc">Descripción</Label>
          <Textarea
            id="p-desc"
            rows={2}
            defaultValue={program?.description ?? ""}
            onBlur={(e) => updateProgram.mutate({ description: e.target.value || null })}
          />
        </div>
      </div>

      <div className="panel mt-4 flex flex-wrap items-end gap-3 p-5">
        <div className="space-y-2">
          <Label htmlFor="d-name">Nuevo día</Label>
          <Input
            id="d-name"
            placeholder="Día 1 — Empuje"
            value={dayName}
            onChange={(e) => setDayName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-focus">Enfoque</Label>
          <Input
            id="d-focus"
            placeholder="Pecho y hombro"
            value={dayFocus}
            onChange={(e) => setDayFocus(e.target.value)}
          />
        </div>
        <Button disabled={!dayName || addDay.isPending} onClick={() => addDay.mutate()}>
          Añadir día
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {days.map((day) => {
          const items = [...day.workout_exercises].sort((a, b) => a.position - b.position);
          return (
            <div key={day.id} className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-card-foreground">
                    {day.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">{day.focus ?? "Sin enfoque"}</p>
                </div>
                <div className="flex gap-3 text-[11px]">
                  <button
                    className="text-primary hover:underline"
                    onClick={() => {
                      setItemDayId(day.id);
                      setItem(emptyItem);
                    }}
                  >
                    Añadir ejercicio
                  </button>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteDay.mutate(day.id)}
                  >
                    Eliminar día
                  </button>
                </div>
              </div>

              <div className="mt-3 divide-y divide-border">
                {items.length ? (
                  items.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm text-foreground">{entry.exercises?.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {entry.sets} × {entry.target_reps ?? "—"} · descanso{" "}
                          {entry.rest_seconds ?? "—"}s · RIR {entry.rir ?? "—"}
                        </p>
                      </div>
                      <button
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={() => deleteItem.mutate(entry.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="py-2.5 text-xs text-muted-foreground">Sin ejercicios.</p>
                )}
              </div>
            </div>
          );
        })}
        {!days.length ? (
          <p className="text-sm text-muted-foreground">Añade el primer día del programa.</p>
        ) : null}
      </div>

      <Dialog open={!!itemDayId} onOpenChange={(next) => !next && setItemDayId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir ejercicio al día</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ejercicio</Label>
              <Select
                value={item.exercise_id}
                onValueChange={(exercise_id) => setItem({ ...item, exercise_id })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir de la biblioteca" />
                </SelectTrigger>
                <SelectContent>
                  {exercises?.map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="i-sets">Series</Label>
                <Input
                  id="i-sets"
                  type="number"
                  value={item.sets}
                  onChange={(e) => setItem({ ...item, sets: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="i-reps">Repeticiones</Label>
                <Input
                  id="i-reps"
                  value={item.target_reps}
                  onChange={(e) => setItem({ ...item, target_reps: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="i-rest">Descanso (s)</Label>
                <Input
                  id="i-rest"
                  type="number"
                  value={item.rest_seconds}
                  onChange={(e) => setItem({ ...item, rest_seconds: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="i-rir">RIR</Label>
                <Input
                  id="i-rir"
                  value={item.rir}
                  onChange={(e) => setItem({ ...item, rir: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-notes">Indicaciones</Label>
              <Textarea
                id="i-notes"
                rows={2}
                value={item.instructions}
                onChange={(e) => setItem({ ...item, instructions: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!item.exercise_id || addExercise.isPending}
              onClick={() => addExercise.mutate()}
            >
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
