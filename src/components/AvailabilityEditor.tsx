import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WEEK_DAYS } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

type AvailabilityRow = {
  id: string;
  client_id: string;
  day_of_week: number;
  is_available: boolean;
  preferred_time: string | null;
};

export function AvailabilityEditor({
  clientId,
  readOnly = false,
}: {
  clientId: string;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();

  const { data: rows } = useQuery({
    queryKey: ["availability", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_availability")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data as AvailabilityRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: {
      day: number;
      is_available: boolean;
      preferred_time: string | null;
    }) => {
      const { error } = await supabase.from("client_availability").upsert(
        {
          client_id: clientId,
          day_of_week: input.day,
          is_available: input.is_available,
          preferred_time: input.preferred_time,
        },
        { onConflict: "client_id,day_of_week" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", clientId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const byDay = new Map((rows ?? []).map((row) => [row.day_of_week, row]));

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border">
      {WEEK_DAYS.map((day) => {
        const row = byDay.get(day.value);
        const available = row?.is_available ?? false;
        return (
          <div key={day.value} className="flex items-center gap-3 px-4 py-3">
            <span className="w-24 text-sm text-foreground">{day.label}</span>

            {readOnly ? (
              <span
                className={`text-xs font-medium ${available ? "text-primary" : "text-muted-foreground"}`}
              >
                {available ? "Disponible" : "No disponible"}
              </span>
            ) : (
              <Switch
                checked={available}
                onCheckedChange={(checked) =>
                  save.mutate({
                    day: day.value,
                    is_available: checked,
                    preferred_time: row?.preferred_time ?? null,
                  })
                }
              />
            )}

            <div className="ml-auto">
              {available ? (
                readOnly ? (
                  <span className="text-xs text-muted-foreground">
                    {row?.preferred_time ? row.preferred_time.slice(0, 5) : "Sin horario"}
                  </span>
                ) : (
                  <Input
                    type="time"
                    className="h-9 w-28"
                    value={row?.preferred_time ? row.preferred_time.slice(0, 5) : ""}
                    onChange={(e) =>
                      save.mutate({
                        day: day.value,
                        is_available: true,
                        preferred_time: e.target.value || null,
                      })
                    }
                  />
                )
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
