"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PermissionGuard, PERMISSIONS } from "@/components/auth/permission-guard";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PermissionGuard permissions={[PERMISSIONS.VIEW_DASHBOARD]}>
        <DashboardLayout>{children}</DashboardLayout>
      </PermissionGuard>
    </AuthProvider>
  );
}
