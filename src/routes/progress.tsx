import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingDown, TrendingUp, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole, FullScreenLoader } from "@/hooks/useRequireRole";
import { ClientShell } from "@/components/ClientShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/progress")({ component: ProgressPage });

function ProgressPage() {
  const { ready, user } = useRequireRole("client");
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [notes, setNotes] = useState("");

  const { data: measurements, isLoading } = useQuery({
    queryKey: ["body-measurements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("body_measurements").select("*").eq("client_id", user!.id).order("measured_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as { id: string; measured_at: string; weight_kg: number | null; waist_cm: number | null; notes: string | null }[];
    },
  });

  const addMeasurement = useMutation({
    mutationFn: async () => {
      if (!user || !weight) throw new Error("Ingresá tu peso");
      const { error } = await supabase.from("body_measurements").insert({ client_id: user.id, weight_kg: Number(weight), waist_cm: waist ? Number(waist) : null, notes: notes || null });
      if (error) throw error;
    },
    onSuccess: () => {
      setWeight(""); setWaist(""); setNotes(""); setShowForm(false);
      toast.success("Progreso guardado");
      void qc.invalidateQueries({ queryKey: ["body-measurements", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!ready || isLoading) return <FullScreenLoader />;
  const latest = measurements?.[0];
  const previous = measurements?.[1];
  const delta = latest?.weight_kg != null && previous?.weight_kg != null ? latest.weight_kg - previous.weight_kg : null;

  return (
    <ClientShell>
      <div className="flex items-center justify-between">
        <div><p className="label-eyebrow">Progreso</p><h1 className="mt-1 font-display text-2xl font-semibold text-card-foreground">Mi evolución</h1></div>
        <Button size="icon" onClick={() => setShowForm((v) => !v)} aria-label="Agregar medición"><Plus /></Button>
      </div>

      {showForm ? (
        <div className="panel mt-4 space-y-3 p-4">
          <p className="font-display text-base font-semibold">Nueva medición</p>
          <Input inputMode="decimal" placeholder="Peso (kg) *" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <Input inputMode="decimal" placeholder="Cintura (cm)" value={waist} onChange={(e) => setWaist(e.target.value)} />
          <Input placeholder="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" disabled={addMeasurement.isPending} onClick={() => addMeasurement.mutate()}>Guardar medición</Button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="panel-raise p-4"><Scale className="size-5 text-primary" /><p className="mt-3 text-[11px] text-muted-foreground">Peso actual</p><p className="font-display text-2xl font-semibold">{latest?.weight_kg != null ? `${latest.weight_kg} kg` : "—"}</p></div>
        <div className="panel-raise p-4">{delta != null && delta < 0 ? <TrendingDown className="size-5 text-primary" /> : <TrendingUp className="size-5 text-primary" />}<p className="mt-3 text-[11px] text-muted-foreground">Desde anterior</p><p className="font-display text-2xl font-semibold">{delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}</p></div>
      </div>

      <div className="mt-5"><p className="label-eyebrow mb-2">Historial</p><div className="panel divide-y divide-border p-4">
        {measurements?.length ? measurements.map((m) => <div key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-medium">{m.weight_kg != null ? `${m.weight_kg} kg` : "Sin peso"}</p><p className="text-[11px] text-muted-foreground">{new Date(`${m.measured_at}T12:00:00`).toLocaleDateString("es-AR")}{m.waist_cm ? ` · cintura ${m.waist_cm} cm` : ""}</p></div>{m.notes ? <span className="max-w-[45%] truncate text-[10px] text-muted-foreground">{m.notes}</span> : null}</div>) : <p className="text-sm text-muted-foreground">Todavía no hay mediciones. Registrá la primera.</p>}
      </div></div>
    </ClientShell>
  );
}
