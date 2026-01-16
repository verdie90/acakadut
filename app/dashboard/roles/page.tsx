"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, serverTimestamp, getDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { AdminOnly } from "@/components/auth/permission-guard";
import { RoleConfig, MenuItem, PERMISSIONS as ALL_PERMISSIONS, DEFAULT_ROLES, DEFAULT_MENUS } from "@/lib/rbac/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Shield, Save, Menu, Lock, Plus, MoreHorizontal, Pencil, Trash2, Copy } from "lucide-react";

const permissionCategories = {
  Dashboard: [ALL_PERMISSIONS.VIEW_DASHBOARD, ALL_PERMISSIONS.VIEW_ANALYTICS],
  Users: [
    ALL_PERMISSIONS.VIEW_USERS,
    ALL_PERMISSIONS.CREATE_USERS,
    ALL_PERMISSIONS.EDIT_USERS,
    ALL_PERMISSIONS.DELETE_USERS,
    ALL_PERMISSIONS.MANAGE_ROLES,
    ALL_PERMISSIONS.MANAGE_USERS,
  ],
  Reports: [
    ALL_PERMISSIONS.VIEW_REPORTS,
    ALL_PERMISSIONS.CREATE_REPORTS,
    ALL_PERMISSIONS.EXPORT_REPORTS,
    ALL_PERMISSIONS.DELETE_REPORTS,
  ],
  Settings: [ALL_PERMISSIONS.VIEW_SETTINGS, ALL_PERMISSIONS.EDIT_SETTINGS, ALL_PERMISSIONS.MANAGE_SETTINGS],
  Menus: [ALL_PERMISSIONS.MANAGE_MENUS],
  Data: [
    ALL_PERMISSIONS.VIEW_ALL_DATA,
    ALL_PERMISSIONS.VIEW_OWN_DATA,
    ALL_PERMISSIONS.EDIT_OWN_DATA,
  ],
  WhatsApp: [
    ALL_PERMISSIONS.VIEW_WHATSAPP,
    ALL_PERMISSIONS.MANAGE_WHATSAPP,
    ALL_PERMISSIONS.VIEW_WHATSAPP_OFFICIAL,
    ALL_PERMISSIONS.MANAGE_WHATSAPP_OFFICIAL,
  ],
};

interface RoleFormData {
  id: string;
  name: string;
  description: string;
}

const defaultFormData: RoleFormData = {
  id: "",
  name: "",
  description: "",
};

// Protected role IDs that cannot be deleted
const PROTECTED_ROLES = ["admin", "manager", "user"];

export default function RolesPage() {
  useAuth(); // For auth state validation
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
  const [allMenus, setAllMenus] = useState<MenuItem[]>(DEFAULT_MENUS); // All menus from Firestore
  const [selectedRole, setSelectedRole] = useState<RoleConfig | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [editedMenuIds, setEditedMenuIds] = useState<string[]>([]);
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"permissions" | "menus">("permissions");

  // CRUD states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleConfig | null>(null);

  // Fetch all menus from Firestore
  useEffect(() => {
    const menusQuery = query(collection(db, "menus"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      menusQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const menusData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as MenuItem[];
          
          // Deduplicate menus by href
          const seenHrefs = new Set<string>();
          const deduplicatedMenus = menusData.filter((menu) => {
            if (seenHrefs.has(menu.href)) return false;
            seenHrefs.add(menu.href);
            return true;
          });
          
          setAllMenus(deduplicatedMenus);
        }
      },
      (error) => {
        console.error("Error fetching menus:", error);
        toast.error("Failed to fetch menus");
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch roles from Firestore and merge with defaults
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
        } else {
          // No roles in Firestore, use defaults
          setRoles(DEFAULT_ROLES);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching roles:", error);
        toast.error("Failed to fetch roles");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Initialize default roles to Firestore
  const initializeDefaultRoles = async () => {
    setSaving(true);
    try {
      for (const role of DEFAULT_ROLES) {
        const { id, ...roleData } = role;
        await setDoc(doc(db, "roles", id), {
          ...roleData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      toast.success("Default roles initialized successfully");
    } catch (error) {
      console.error("Error initializing roles:", error);
      toast.error("Failed to initialize roles");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectRole = (role: RoleConfig) => {
    setSelectedRole(role);
    setEditedPermissions([...role.permissions]);
    setEditedMenuIds([...(role.menuIds || [])]);
  };

  const handleTogglePermission = (permission: string) => {
    setEditedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleToggleMenu = (menuId: string) => {
    setEditedMenuIds((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      const roleRef = doc(db, "roles", selectedRole.id);
      const roleDoc = await getDoc(roleRef);

      if (roleDoc.exists()) {
        // Update existing document
        await updateDoc(roleRef, {
          permissions: editedPermissions,
          menuIds: editedMenuIds,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new document if it doesn't exist (for default roles)
        await setDoc(roleRef, {
          name: selectedRole.name,
          description: selectedRole.description,
          permissions: editedPermissions,
          menuIds: editedMenuIds,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`Role "${selectedRole.name}" updated successfully`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  // Create new role
  const handleCreateRole = async () => {
    if (!formData.id || !formData.name) {
      toast.error("Role ID and name are required");
      return;
    }

    // Validate role ID format (lowercase, no spaces)
    const roleId = formData.id.toLowerCase().replace(/\s+/g, "_");

    // Check if role ID already exists
    if (roles.some((r) => r.id === roleId)) {
      toast.error("A role with this ID already exists");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "roles", roleId), {
        name: formData.name,
        description: formData.description,
        permissions: [ALL_PERMISSIONS.VIEW_DASHBOARD, ALL_PERMISSIONS.VIEW_OWN_DATA],
        menuIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`Role "${formData.name}" created successfully`);
      setDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  // Update role info (name, description)
  const handleUpdateRoleInfo = async () => {
    if (!formData.name) {
      toast.error("Role name is required");
      return;
    }

    setSaving(true);
    try {
      const roleRef = doc(db, "roles", formData.id);
      const roleDoc = await getDoc(roleRef);

      if (roleDoc.exists()) {
        await updateDoc(roleRef, {
          name: formData.name,
          description: formData.description,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create if doesn't exist (for default roles)
        const defaultRole = DEFAULT_ROLES.find((r) => r.id === formData.id);
        await setDoc(roleRef, {
          name: formData.name,
          description: formData.description,
          permissions: defaultRole?.permissions || [],
          menuIds: defaultRole?.menuIds || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`Role "${formData.name}" updated successfully`);
      setDialogOpen(false);
      setFormData(defaultFormData);
      setIsEditing(false);

      // Update selected role if it was the one edited
      if (selectedRole?.id === formData.id) {
        setSelectedRole({
          ...selectedRole,
          name: formData.name,
          description: formData.description,
        });
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setSaving(true);
    try {
      await deleteDoc(doc(db, "roles", roleToDelete.id));
      toast.success(`Role "${roleToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);

      // Clear selection if deleted role was selected
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(null);
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    } finally {
      setSaving(false);
    }
  };

  // Duplicate role
  const handleDuplicateRole = async (role: RoleConfig) => {
    const newId = `${role.id}_copy_${Date.now()}`;
    const newName = `${role.name} (Copy)`;

    setSaving(true);
    try {
      await setDoc(doc(db, "roles", newId), {
        name: newName,
        description: role.description,
        permissions: [...role.permissions],
        menuIds: [...(role.menuIds || [])],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`Role duplicated as "${newName}"`);
    } catch (error) {
      console.error("Error duplicating role:", error);
      toast.error("Failed to duplicate role");
    } finally {
      setSaving(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (role: RoleConfig) => {
    setFormData({
      id: role.id,
      name: role.name,
      description: role.description,
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setFormData(defaultFormData);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const formatPermissionName = (permission: string) => {
    return permission
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Check if roles are from Firestore or default
  const rolesNeedInit = roles === DEFAULT_ROLES || roles.every(
    (r) => DEFAULT_ROLES.some((dr) => dr.id === r.id && dr.name === r.name)
  );

  return (
    <AdminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">
              Configure roles and permissions for your application
            </p>
          </div>
          <div className="flex gap-2">
            {rolesNeedInit && (
              <Button
                variant="outline"
                onClick={initializeDefaultRoles}
                disabled={saving}
              >
                <Shield className="mr-2 h-4 w-4" />
                Initialize Defaults
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                <DialogTitle>{isEditing ? "Edit Role" : "Create New Role"}</DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? "Update the role information"
                    : "Add a new role to your application"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {!isEditing && (
                  <div className="grid gap-2">
                    <Label htmlFor="roleId">Role ID</Label>
                    <Input
                      id="roleId"
                      value={formData.id}
                      onChange={(e) =>
                        setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                      }
                      placeholder="e.g., editor, viewer, analyst"
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for the role (lowercase, no spaces)
                    </p>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Content Editor"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="roleDescription">Description</Label>
                  <Textarea
                    id="roleDescription"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this role can do..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={isEditing ? handleUpdateRoleInfo : handleCreateRole}
                  disabled={saving}
                >
                  {saving ? "Saving..." : isEditing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
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
                  <div
                    key={role.id}
                    className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${selectedRole?.id === role.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                      }`}
                  >
                    <button
                      onClick={() => handleSelectRole(role)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <Shield
                        className={`h-5 w-5 ${role.id === "admin"
                            ? "text-red-500"
                            : role.id === "manager"
                              ? "text-blue-500"
                              : "text-gray-500"
                          }`}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{role.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {role.permissions.length} permissions, {(role.menuIds || []).length} menus
                        </div>
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(role)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Info
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        {!PROTECTED_ROLES.includes(role.id) && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setRoleToDelete(role);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permissions & Menus Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedRole ? `${selectedRole.name} Configuration` : "Select a Role"}
                  </CardTitle>
                  <CardDescription>
                    {selectedRole
                      ? selectedRole.description
                      : "Choose a role from the list to edit its configuration"}
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
                <div className="space-y-6">
                  {/* Main Tabs: Permissions vs Menus */}
                  <div className="flex gap-2 border-b pb-2">
                    <Button
                      variant={activeTab === "permissions" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab("permissions")}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Permissions
                    </Button>
                    <Button
                      variant={activeTab === "menus" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab("menus")}
                    >
                      <Menu className="mr-2 h-4 w-4" />
                      Menu Access
                    </Button>
                  </div>

                  {activeTab === "permissions" ? (
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
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Select which menu items this role can access. Users will only see menus assigned to their role.
                      </p>
                      {allMenus.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No menus configured. Go to Menu Management to add menus.
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {allMenus.map((menu: MenuItem) => (
                            <div
                              key={menu.id}
                              className="flex items-center justify-between rounded-lg border p-4"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`menu-${menu.id}`}
                                  checked={editedMenuIds.includes(menu.id)}
                                  onCheckedChange={() => handleToggleMenu(menu.id)}
                                  disabled={selectedRole.id === "admin"}
                                />
                                <Label
                                  htmlFor={`menu-${menu.id}`}
                                  className="cursor-pointer font-medium"
                                >
                                  {menu.title}
                                </Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{menu.href}</Badge>
                                {menu.permission && (
                                  <Badge variant="secondary">{menu.permission}</Badge>
                                )}
                                {!menu.isActive && (
                                  <Badge variant="destructive">Inactive</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;?
                Users with this role will lose their permissions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRole}
                disabled={saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminOnly>
  );
}
