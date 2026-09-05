import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Nueva contraseña — Vanta" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta de Vanta." },
      { property: "og:title", content: "Nueva contraseña — Vanta" },
      {
        property: "og:description",
        content: "Define una nueva contraseña para tu cuenta de Vanta.",
      },
    ],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-6">
        <h1 className="font-display text-xl font-semibold text-card-foreground">
          Nueva contraseña
        </h1>
        <div className="space-y-2">
          <Label htmlFor="new-password">Contraseña</Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Guardar
        </Button>
      </form>
    </div>
  );
}
