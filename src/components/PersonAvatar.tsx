import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined) {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PersonAvatar({
  path,
  name,
  className,
}: {
  path: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ["avatar", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path!, 60 * 60);
      return data?.signedUrl ?? null;
    },
  });

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border",
        className ?? "size-10",
      )}
    >
      {url ? (
        <img src={url} alt={name ?? "Foto de perfil"} className="size-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
