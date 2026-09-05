import { createFileRoute } from "@tanstack/react-router";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MUSCLE_GROUPS } from "@/lib/constants";

export const Route = createFileRoute("/admin/exercises")({
  component: AdminExercises,
  head: () => ({
    meta: [
      { title: "Biblioteca de ejercicios — Vanta" },
      { name: "description", content: "Crea y organiza los ejercicios disponibles para tus programas." },
      { property: "og:title", content: "Biblioteca de ejercicios — Vanta" },
      {
        property: "og:description",
        content: "Crea y organiza los ejercicios disponibles para tus programas.",
      },
    ],
  }),
});

export type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string | null;
  primary_muscle: string | null;
  description: string | null;
  technique: string | null;
  tips: string | null;
  video_url: string | null;
};

const emptyExercise = {
  name: "",
  muscle_group: "",
  primary_muscle: "",
  description: "",
  technique: "",
  tips: "",
  video_url: "",
};

function AdminExercises() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyExercise);

  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data as ExerciseRow[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        muscle_group: form.muscle_group || null,
        primary_muscle: form.primary_muscle || null,
        description: form.description || null,
        technique: form.technique || null,
        tips: form.tips || null,
        video_url: form.video_url || null,
      };
      const { error } = editing
        ? await supabase.from("exercises").update(payload).eq("id", editing)
        : await supabase.from("exercises").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Ejercicio actualizado" : "Ejercicio creado");
      setOpen(false);
      setEditing(null);
      setForm(emptyExercise);
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ejercicio eliminado");
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
    onError: () => toast.error("No se puede eliminar: está en uso en un programa."),
  });

  const filtered = (exercises ?? []).filter((exercise) =>
    `${exercise.name} ${exercise.muscle_group ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-card-foreground">Ejercicios</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {exercises?.length ?? 0} ejercicios en la biblioteca
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar ejercicio"
            className="w-56"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setEditing(null);
                setForm(emptyExercise);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>Nuevo ejercicio</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar ejercicio" : "Nuevo ejercicio"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ex-name">Nombre</Label>
                  <Input
                    id="ex-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Grupo muscular</Label>
                    <Select
                      value={form.muscle_group}
                      onValueChange={(muscle_group) => setForm({ ...form, muscle_group })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSCLE_GROUPS.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ex-primary">Músculo principal</Label>
                    <Input
                      id="ex-primary"
                      value={form.primary_muscle}
                      onChange={(e) => setForm({ ...form, primary_muscle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ex-desc">Descripción</Label>
                  <Textarea
                    id="ex-desc"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ex-tech">Técnica</Label>
                  <Textarea
                    id="ex-tech"
                    rows={2}
                    value={form.technique}
                    onChange={(e) => setForm({ ...form, technique: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ex-tips">Consejos</Label>
                  <Textarea
                    id="ex-tips"
                    rows={2}
                    value={form.tips}
                    onChange={(e) => setForm({ ...form, tips: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ex-video">Vídeo (URL)</Label>
                  <Input
                    id="ex-video"
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!form.name || upsert.isPending}
                  onClick={() => upsert.mutate()}
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((exercise) => (
          <div key={exercise.id} className="panel-raise p-4">
            <p className="label-eyebrow">{exercise.muscle_group ?? "Sin grupo"}</p>
            <h3 className="mt-1 font-display text-base font-semibold text-card-foreground">
              {exercise.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              {exercise.description ?? exercise.technique ?? "Sin descripción"}
            </p>
            <div className="mt-3 flex gap-3 text-[11px]">
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  setEditing(exercise.id);
                  setForm({
                    name: exercise.name,
                    muscle_group: exercise.muscle_group ?? "",
                    primary_muscle: exercise.primary_muscle ?? "",
                    description: exercise.description ?? "",
                    technique: exercise.technique ?? "",
                    tips: exercise.tips ?? "",
                    video_url: exercise.video_url ?? "",
                  });
                  setOpen(true);
                }}
              >
                Editar
              </button>
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(exercise.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {!filtered.length ? (
          <p className="text-sm text-muted-foreground">No hay ejercicios que coincidan.</p>
        ) : null}
      </div>
    </>
  );
}
