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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRAINING_GOALS, type ProfileRow } from "@/lib/constants";

export const Route = createFileRoute("/admin/programs/")({
  component: AdminPrograms,
  head: () => ({
    meta: [
      { title: "Programas — Vanta" },
      { name: "description", content: "Crea programas de entrenamiento y asígnalos a tus clientes." },
      { property: "og:title", content: "Programas — Vanta" },
      {
        property: "og:description",
        content: "Crea programas de entrenamiento y asígnalos a tus clientes.",
      },
    ],
  }),
});

function AdminPrograms() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", goal: "", client_id: "" });

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_programs")
        .select("id, name, goal, is_active, client_id, workout_days(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        goal: string | null;
        is_active: boolean;
        client_id: string | null;
        workout_days: { id: string }[];
      }[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("workout_programs")
        .insert({
          name: form.name,
          description: form.description || null,
          goal: form.goal || null,
          client_id: form.client_id || null,
          created_by: auth.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Programa creado");
      setOpen(false);
      setForm({ name: "", description: "", goal: "", client_id: "" });
      void queryClient.invalidateQueries({ queryKey: ["programs"] });
      void navigate({ to: "/admin/programs/$programId", params: { programId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clientName = (id: string | null) =>
    clients?.find((client) => client.id === id)?.full_name ?? "Sin asignar";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-card-foreground">Programas</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {programs?.length ?? 0} programas creados
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nuevo programa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo programa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Nombre</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select value={form.goal} onValueChange={(goal) => setForm({ ...form, goal })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_GOALS.map((goal) => (
                      <SelectItem key={goal} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(client_id) => setForm({ ...form, client_id })}
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
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!form.name || create.isPending} onClick={() => create.mutate()}>
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {programs?.map((program) => (
          <Link
            key={program.id}
            to="/admin/programs/$programId"
            params={{ programId: program.id }}
            className="panel-raise p-4 transition-colors hover:bg-muted/40"
          >
            <p className="label-eyebrow">{program.goal ?? "Sin objetivo"}</p>
            <h3 className="mt-1 font-display text-base font-semibold text-card-foreground">
              {program.name}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {clientName(program.client_id)} · {program.workout_days.length} días ·{" "}
              {program.is_active ? "Activo" : "Inactivo"}
            </p>
          </Link>
        ))}
        {!programs?.length ? (
          <p className="text-sm text-muted-foreground">Todavía no hay programas.</p>
        ) : null}
      </div>
    </>
  );
}
