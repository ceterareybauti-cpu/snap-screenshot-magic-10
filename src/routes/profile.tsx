import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequireRole, FullScreenLoader } from "@/hooks/useRequireRole";
import { ClientShell } from "@/components/ClientShell";
import { PersonAvatar } from "@/components/PersonAvatar";
import { AvailabilityEditor } from "@/components/AvailabilityEditor";
import { ProfileFields, type ProfileFormValues } from "@/components/ProfileFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ageFromDob, profileCompletion, type ProfileRow } from "@/lib/constants";

export const Route = createFileRoute("/profile")({
  component: ClientProfile,
  head: () => ({
    meta: [
      { title: "Mi perfil — Vanta" },
      { name: "description", content: "Actualiza tus datos y tu disponibilidad semanal." },
      { property: "og:title", content: "Mi perfil — Vanta" },
      {
        property: "og:description",
        content: "Actualiza tus datos y tu disponibilidad semanal.",
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

function ClientProfile() {
  const { ready, user } = useRequireRole("client");
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormValues>(emptyForm);
  const [uploading, setUploading] = useState(false);

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
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });
    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foto actualizada");
    void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  if (!ready) return <FullScreenLoader />;

  return (
    <ClientShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-card-foreground">Mi perfil</h1>
        <span className="text-xs text-primary">{profileCompletion(profile)}% completo</span>
      </div>

      <div className="panel mt-4 flex items-center gap-4 p-4">
        <PersonAvatar path={profile?.avatar_url} name={profile?.full_name} className="size-16" />
        <div className="min-w-0">
          <Label htmlFor="photo" className="text-xs text-muted-foreground">
            Foto de perfil
          </Label>
          <Input
            id="photo"
            type="file"
            accept="image/*"
            disabled={uploading}
            className="mt-1"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPhoto(file);
            }}
          />
        </div>
      </div>

      <div className="panel mt-4 space-y-4 p-4">
        <ProfileFields value={form} onChange={setForm} />
        <p className="text-[11px] text-muted-foreground">
          Edad: {ageFromDob(form.date_of_birth) ?? "—"}
        </p>
        <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
          Guardar cambios
        </Button>
      </div>

      <div className="mt-6">
        <p className="label-eyebrow mb-2">Disponibilidad semanal</p>
        {user ? <AvailabilityEditor clientId={user.id} /> : null}
      </div>

      <Button variant="outline" className="mt-6 w-full" onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </ClientShell>
  );
}
