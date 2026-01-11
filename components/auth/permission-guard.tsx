"use client";

import { useAuth, PERMISSIONS } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { LoaderOne } from "@/components/ui/loader";

interface PermissionGuardProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  children,
  permissions = [],
  requireAll = false,
  fallback,
  redirectTo,
}: PermissionGuardProps) {
  const { user, loading, hasAnyPermission, hasAllPermissions } = useAuth();
  const router = useRouter();

  const hasAccess =
    permissions.length === 0 ||
    (requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions));

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !hasAccess && redirectTo) {
      router.push(redirectTo);
    }
  }, [loading, user, hasAccess, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderOne />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to access this resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ children, roles, fallback, redirectTo }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const hasRole = user && roles.includes(user.role);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !hasRole && redirectTo) {
      router.push(redirectTo);
    }
  }, [loading, user, hasRole, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderOne  />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasRole) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">
          Your role doesn&apos;t have permission to access this resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

interface AdminOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  return (
    <RoleGuard roles={["admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function ManagerOrAbove({ children, fallback }: AdminOnlyProps) {
  return (
    <RoleGuard roles={["admin", "manager"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export { PERMISSIONS };
