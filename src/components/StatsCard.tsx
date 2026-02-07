import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
};

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) => {
  return (
    <Card
      className={`p-6 hover:shadow-lg hover:shadow-primary/5 transition-all group ${
        className ?? ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
            {value}
          </p>
          {trend && (
            <p
              className={`text-xs font-medium ${
                trend.isPositive ? "text-status-pago" : "text-status-perdido"
              }`}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}% este mês
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};
