import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
}

export function StatsCard({ title, value, icon: Icon, variant = "default" }: StatsCardProps) {
  const iconStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  const borderStyles = {
    default: "border-l-primary",
    success: "border-l-success",
    warning: "border-l-warning",
    danger: "border-l-destructive",
  };

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-l-[3px] ${borderStyles[variant]} bg-card p-4 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}
