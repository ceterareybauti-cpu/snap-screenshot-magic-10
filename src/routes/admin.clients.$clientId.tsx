import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      { name: "description", content: "Datos, disponibilidad y programa asignado del cliente." },
      { property: "og:title", content: "Ficha de cliente — Vanta" },
      {
        property: "og:description",
        content: "Datos, disponibilidad y programa asignado del cliente.",
      },
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

function AdminClientDetail() {
  const { clientId } = Route.useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormValues>(emptyForm);

  const { data: profile } = useQuery({
    queryKey: ["admin-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();
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
      return data as {
        id: string;
        name: string;
        goal: string | null;
        is_active: boolean;
        workout_days: { id: string }[];
      }[];
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
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          date_of_birth: form.date_of_birth || null,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
          height_cm: form.height_cm ? Number(form.height_cm) : null,
          goal: form.goal || null,
          experience: form.experience || null,
          notes: form.notes || null,
        })
        .eq("id", clientId);
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
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !profile?.is_active })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Link to="/admin/clients" className="text-xs text-muted-foreground hover:text-foreground">
        ← Volver a clientes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <PersonAvatar path={profile?.avatar_url} name={profile?.full_name} className="size-14" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-card-foreground">
              {profile?.full_name ?? "Sin nombre"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {profile?.goal ?? "Sin objetivo"} · {profile?.experience ?? "—"} ·{" "}
              {ageFromDob(profile?.date_of_birth ?? null) ?? "—"} años ·{" "}
              {profileCompletion(profile)}% completo
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => toggleActive.mutate()}>
          {profile?.is_active ? "Marcar como inactivo" : "Marcar como activo"}
        </Button>
      </div>

      <Tabs defaultValue="resumen" className="mt-6">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
          <TabsTrigger value="entrenamiento">Entrenamiento</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <div className="panel space-y-4 p-5">
            <ProfileFields value={form} onChange={setForm} />
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Guardar ficha
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="disponibilidad" className="mt-4">
          <AvailabilityEditor clientId={clientId} />
        </TabsContent>

        <TabsContent value="entrenamiento" className="mt-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="label-eyebrow">Programas asignados</p>
              <Link to="/admin/programs" className="text-xs text-primary hover:underline">
                Gestionar programas
              </Link>
            </div>
            <div className="mt-3 divide-y divide-border">
              {programs?.length ? (
                programs.map((program) => (
                  <Link
                    key={program.id}
                    to="/admin/programs/$programId"
                    params={{ programId: program.id }}
                    className="flex items-center justify-between py-3 hover:text-primary"
                  >
                    <span className="text-sm text-foreground">{program.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {program.workout_days.length} días ·{" "}
                      {program.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">Sin programas asignados.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
