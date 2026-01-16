"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MessageCircle, Cloud, Building2, Instagram } from "lucide-react";

const platformTabs = [
  {
    title: "WhatsApp Unofficial",
    href: "/dashboard/platforms",
    icon: MessageCircle,
    exact: true,
    description: "Integrasi langsung via WhatsApp Web",
  },
  {
    title: "WA Business Cloud",
    href: "/dashboard/platforms/wa-cloud",
    icon: Cloud,
    description: "WhatsApp Business Cloud API",
  },
  {
    title: "WA Business API",
    href: "/dashboard/platforms/wa-business",
    icon: Building2,
    description: "WhatsApp Business API",
  },
  {
    title: "Instagram",
    href: "/dashboard/platforms/instagram",
    icon: Instagram,
    description: "Instagram Direct Messages",
  },
];

export default function PlatformsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Manager</h1>
        <p className="text-muted-foreground">
          Kelola semua integrasi platform messaging Anda
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {platformTabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
