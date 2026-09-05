import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowDown, ArrowUp, Minus, TrendingDown, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PersonAvatar } from "@/components/PersonAvatar";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { ProfileFields, type ProfileFormValues } from "@/components/ProfileFields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ageFromDob, profileCompletion, type ProfileRow } from "@/lib/constants";

export const Route = createFileRoute("/admin/clients/$clientId")({
  component: AdminClientDetail,
  head: () => ({
    meta: [
      { title: "Ficha de cliente — Vanta" },
      { name: "description", content: "Datos, progreso, disponibilidad y programa del cliente." },
      { property: "og:title", content: "Ficha de cliente — Vanta" },
      { property: "og:description", content: "Datos, progreso, disponibilidad y programa del cliente." },
    ],
  }),
});

const emptyForm: ProfileFormValues = {
  full_name: "",
  date_of_birth: "",
  weight_kg: "",
  height_cm: "",
  goal: "",
  experience: "",
  notes: "",
};

type Measurement = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
};

type Session = {
  id: string;
  workout_date: string;
  completed_at: string | null;
};

function AdminClientDetail() {
  const { clientId } = Route.useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormValues>(emptyForm);
  const [measurementForm, setMeasurementForm] = useState({ weight: "", waist: "", notes: "" });

  const { data: profile } = useQuery({
    queryKey: ["admin-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ["admin-client-programs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_programs")
        .select("id, name, goal, is_active, workout_days(id)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; name: string; goal: string | null; is_active: boolean; workout_days: { id: string }[] }[];
    },
  });

  const { data: measurements } = useQuery({
    queryKey: ["admin-client-measurements", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_measurements")
        .select("id, measured_at, weight_kg, body_fat_percent, waist_cm, chest_cm, arm_cm, thigh_cm, notes")
        .eq("client_id", clientId)
        .order("measured_at", { ascending: false });
      if (error) throw error;
      return data as Measurement[];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["admin-client-sessions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("id, workout_date, completed_at")
        .eq("client_id", clientId)
        .order("workout_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Session[];
    },
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      weight_kg: profile.weight_kg?.toString() ?? "",
      height_cm: profile.height_cm?.toString() ?? "",
      goal: profile.goal ?? "",
      experience: profile.experience ?? "",
      notes: profile.notes ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name || null,
        date_of_birth: form.date_of_birth || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        goal: form.goal || null,
        experience: form.experience || null,
        notes: form.notes || null,
      }).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ficha actualizada");
      void queryClient.invalidateQueries({ queryKey: ["admin-client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ is_active: !profile?.is_active }).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMeasurement = useMutation({
    mutationFn: async () => {
      if (!measurementForm.weight && !measurementForm.waist) throw new Error("Cargá al menos peso o cintura");
      const { error } = await supabase.from("body_measurements").insert({
        client_id: clientId,
        measured_at: new Date().toISOString().slice(0, 10),
        weight_kg: measurementForm.weight ? Number(measurementForm.weight) : null,
        waist_cm: measurementForm.waist ? Number(measurementForm.waist) : null,
        notes: measurementForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medición agregada");
      setMeasurementForm({ weight: "", waist: "", notes: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-client-measurements", clientId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const latest = measurements?.[0];
  const previous = measurements?.[1];
  const weightChange = latest?.weight_kg != null && previous?.weight_kg != null ? latest.weight_kg - previous.weight_kg : null;
  const completedSessions = sessions?.filter((session) => !!session.completed_at).length ?? 0;

  return (
    <>
      <Link to="/admin/clients" className="text-xs text-muted-foreground hover:text-foreground">← Volver a clientes</Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <PersonAvatar path={profile?.avatar_url} name={profile?.full_name} className="size-14" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-card-foreground">{profile?.full_name ?? "Sin nombre"}</h1>
            <p className="text-xs text-muted-foreground">
              {profile?.goal ?? "Sin objetivo"} · {profile?.experience ?? "—"} · {ageFromDob(profile?.date_of_birth ?? null) ?? "—"} años · {profileCompletion(profile)}% completo
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => toggleActive.mutate()}>{profile?.is_active ? "Marcar como inactivo" : "Marcar como activo"}</Button>
      </div>

      <Tabs defaultValue="resumen" className="mt-6">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="progreso">Progreso</TabsTrigger>
          <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
          <TabsTrigger value="entrenamiento">Entrenamiento</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <div className="panel space-y-4 p-5">
            <ProfileFields value={form} onChange={setForm} />
            <Button disabled={save.isPending} onClick={() => save.mutate()}>Guardar ficha</Button>
          </div>
        </TabsContent>

        <TabsContent value="progreso" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="panel p-4"><p className="label-eyebrow">Peso actual</p><p className="mt-1 font-display text-2xl font-semibold">{latest?.weight_kg ?? profile?.weight_kg ?? "—"}{latest?.weight_kg || profile?.weight_kg ? " kg" : ""}</p></div>
            <div className="panel p-4"><p className="label-eyebrow">Cambio</p><p className="mt-1 flex items-center gap-1 font-display text-2xl font-semibold">{weightChange == null ? <Minus className="size-5" /> : weightChange < 0 ? <ArrowDown className="size-5" /> : <ArrowUp className="size-5" />}{weightChange == null ? "—" : `${Math.abs(weightChange).toFixed(1)} kg`}</p></div>
            <div className="panel p-4"><p className="label-eyebrow">Entrenos completos</p><p className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold"><Trophy className="size-5" />{completedSessions}</p></div>
            <div className="panel p-4"><p className="label-eyebrow">Registros</p><p className="mt-1 font-display text-2xl font-semibold">{measurements?.length ?? 0}</p></div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2"><TrendingDown className="size-4 text-primary" /><p className="label-eyebrow">Nueva medición</p></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" inputMode="decimal" placeholder="Peso (kg)" value={measurementForm.weight} onChange={(e) => setMeasurementForm((v) => ({ ...v, weight: e.target.value }))} />
              <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" inputMode="decimal" placeholder="Cintura (cm)" value={measurementForm.waist} onChange={(e) => setMeasurementForm((v) => ({ ...v, waist: e.target.value }))} />
            </div>
            <input className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Nota opcional" value={measurementForm.notes} onChange={(e) => setMeasurementForm((v) => ({ ...v, notes: e.target.value }))} />
            <Button className="mt-3 w-full" disabled={addMeasurement.isPending} onClick={() => addMeasurement.mutate()}>Guardar medición</Button>
          </div>

          <div className="panel p-5">
            <p className="label-eyebrow">Historial</p>
            <div className="mt-3 divide-y divide-border">
              {measurements?.length ? measurements.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div><p className="text-sm font-medium text-foreground">{new Date(`${item.measured_at}T12:00:00`).toLocaleDateString("es-AR")}</p><p className="text-[11px] text-muted-foreground">{item.notes ?? "Sin nota"}</p></div>
                  <div className="text-right text-xs text-muted-foreground"><p>{item.weight_kg != null ? `${item.weight_kg} kg` : "—"}</p><p>{item.waist_cm != null ? `${item.waist_cm} cm cintura` : ""}</p></div>
                </div>
              )) : <p className="py-3 text-sm text-muted-foreground">Todavía no hay mediciones.</p>}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2"><Activity className="size-4 text-primary" /><p className="label-eyebrow">Actividad reciente</p></div>
            <div className="mt-3 space-y-2">
              {sessions?.length ? sessions.slice(0, 8).map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs"><span>{new Date(`${session.workout_date}T12:00:00`).toLocaleDateString("es-AR")}</span><span className={session.completed_at ? "font-medium text-primary" : "text-muted-foreground"}>{session.completed_at ? "Completado" : "Iniciado"}</span></div>
              )) : <p className="text-sm text-muted-foreground">Todavía no hay entrenamientos registrados.</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="disponibilidad" className="mt-4"><AvailabilityEditor clientId={clientId} /></TabsContent>

        <TabsContent value="entrenamiento" className="mt-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between"><p className="label-eyebrow">Programas asignados</p><Link to="/admin/programs" className="text-xs text-primary hover:underline">Gestionar programas</Link></div>
            <div className="mt-3 divide-y divide-border">
              {programs?.length ? programs.map((program) => (
                <Link key={program.id} to="/admin/programs/$programId" params={{ programId: program.id }} className="flex items-center justify-between py-3 hover:text-primary"><span className="text-sm text-foreground">{program.name}</span><span className="text-[11px] text-muted-foreground">{program.workout_days.length} días · {program.is_active ? "Activo" : "Inactivo"}</span></Link>
              )) : <p className="py-3 text-sm text-muted-foreground">Sin programas asignados.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
