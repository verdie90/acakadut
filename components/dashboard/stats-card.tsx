"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden group transition-all duration-300",
      "bg-gradient-to-br from-card via-card to-card/80",
      "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1",
      "border-border/50",
      className
    )}>
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  "font-semibold px-1.5 py-0.5 rounded-md",
                  trend.isPositive
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "text-red-600 dark:text-red-400 bg-red-500/10"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>

      {/* Decorative corner gradient */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
}

