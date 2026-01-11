"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { AdminOnly } from "@/components/auth/permission-guard";
import { RoleConfig, PERMISSIONS as ALL_PERMISSIONS, DEFAULT_ROLES } from "@/lib/rbac/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, Save } from "lucide-react";

const permissionCategories = {
  Dashboard: [ALL_PERMISSIONS.VIEW_DASHBOARD, ALL_PERMISSIONS.VIEW_ANALYTICS],
  Users: [
    ALL_PERMISSIONS.VIEW_USERS,
    ALL_PERMISSIONS.CREATE_USERS,
    ALL_PERMISSIONS.EDIT_USERS,
    ALL_PERMISSIONS.DELETE_USERS,
    ALL_PERMISSIONS.MANAGE_ROLES,
  ],
  Reports: [
    ALL_PERMISSIONS.VIEW_REPORTS,
    ALL_PERMISSIONS.CREATE_REPORTS,
    ALL_PERMISSIONS.EXPORT_REPORTS,
  ],
  Settings: [ALL_PERMISSIONS.VIEW_SETTINGS, ALL_PERMISSIONS.EDIT_SETTINGS],
  Data: [
    ALL_PERMISSIONS.VIEW_ALL_DATA,
    ALL_PERMISSIONS.VIEW_OWN_DATA,
    ALL_PERMISSIONS.EDIT_OWN_DATA,
  ],
};

export default function RolesPage() {
  useAuth(); // For auth state
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState<RoleConfig | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const rolesRef = collection(db, "roles");
    const unsubscribe = onSnapshot(
      rolesRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const rolesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as RoleConfig[];
          setRoles(rolesData);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching roles:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSelectRole = (role: RoleConfig) => {
    setSelectedRole(role);
    setEditedPermissions([...role.permissions]);
  };

  const handleTogglePermission = (permission: string) => {
    setEditedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      const roleRef = doc(db, "roles", selectedRole.id);
      await updateDoc(roleRef, {
        permissions: editedPermissions,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Permissions updated for ${selectedRole.name}`);
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const formatPermissionName = (permission: string) => {
    return permission
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <AdminOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Configure roles and permissions for your application
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Roles List */}
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Select a role to edit permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedRole?.id === role.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Shield
                      className={`h-5 w-5 ${
                        role.id === "admin"
                          ? "text-red-500"
                          : role.id === "manager"
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {role.permissions.length} permissions
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedRole ? `${selectedRole.name} Permissions` : "Select a Role"}
                  </CardTitle>
                  <CardDescription>
                    {selectedRole
                      ? selectedRole.description
                      : "Choose a role from the list to edit its permissions"}
                  </CardDescription>
                </div>
                {selectedRole && (
                  <Button onClick={handleSavePermissions} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedRole ? (
                <Tabs defaultValue="Dashboard" className="w-full">
                  <TabsList className="mb-4 w-full justify-start">
                    {Object.keys(permissionCategories).map((category) => (
                      <TabsTrigger key={category} value={category}>
                        {category}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.entries(permissionCategories).map(([category, permissions]) => (
                    <TabsContent key={category} value={category}>
                      <div className="space-y-4">
                        {permissions.map((permission) => (
                          <div
                            key={permission}
                            className="flex items-center justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={permission}
                                checked={editedPermissions.includes(permission)}
                                onCheckedChange={() => handleTogglePermission(permission)}
                                disabled={selectedRole.id === "admin"}
                              />
                              <Label
                                htmlFor={permission}
                                className="cursor-pointer font-medium"
                              >
                                {formatPermissionName(permission)}
                              </Label>
                            </div>
                            <Badge variant="outline">{permission}</Badge>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="flex h-75 items-center justify-center text-muted-foreground">
                  Select a role to view and edit permissions
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role Description */}
        {selectedRole && selectedRole.id === "admin" && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> Admin role has all permissions by default and cannot be
                modified. This ensures there&apos;s always a role with full access to manage the
                system.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminOnly>
  );
}
