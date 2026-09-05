export function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="panel-raise p-4">
      <p className="label-eyebrow">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-semibold ${
          highlight ? "text-primary" : "text-card-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
