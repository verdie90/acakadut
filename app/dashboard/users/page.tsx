"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, addDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth, PERMISSIONS } from "@/contexts/auth-context";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { UsersTable } from "@/components/dashboard/users-table";
import { User, UserRole, RoleConfig, DEFAULT_ROLES } from "@/lib/rbac/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";

interface UserFormData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

const defaultFormData: UserFormData = {
  email: "",
  password: "",
  displayName: "",
  role: "user",
  isActive: true,
};

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Create/Edit dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);
  const [editFormData, setEditFormData] = useState<Partial<User> & { uid: string }>({ uid: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users
  useEffect(() => {
    const usersQuery = query(collection(db, "users"));
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as User[];
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch roles with realtime listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "roles"),
      (snapshot) => {
        if (!snapshot.empty) {
          const rolesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as RoleConfig[];
          setRoles(rolesData);
        }
      },
      (error) => {
        console.error("Error fetching roles:", error);
        toast.error("Failed to fetch roles");
      }
    );

    return () => unsubscribe();
  }, []);

  // Create new user
  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: formData.displayName,
      });

      // Get role config to get proper menuIds
      const roleConfig = roles.find(r => r.id === formData.role);
      const menuIds = roleConfig?.menuIds || (formData.role === "admin" ? [] : ["dashboard"]);

      // Create user document in Firestore with Auth UID as document ID
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        isActive: formData.isActive,
        photoURL: null,
        menuIds: menuIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Log activity
      await addDoc(collection(db, "activities"), {
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName,
        action: `Created new user ${formData.displayName}`,
        details: `User ${formData.email} was added with role ${formData.role}`,
        timestamp: serverTimestamp(),
        type: "success",
      });

      toast.success(`User ${formData.displayName} created successfully`);
      setDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create user";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (user: User, newRole: UserRole) => {
    if (!hasPermission(PERMISSIONS.MANAGE_ROLES)) {
      toast.error("You don't have permission to change roles");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      // Log the activity
      await addDoc(collection(db, "activities"), {
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName,
        action: `Changed role for ${user.displayName}`,
        details: `Role changed from ${user.role} to ${newRole}`,
        timestamp: serverTimestamp(),
        type: "info",
      });

      toast.success(`Role updated to ${newRole} for ${user.displayName}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !hasPermission(PERMISSIONS.DELETE_USERS)) {
      toast.error("You don't have permission to delete users");
      return;
    }

    try {
      await deleteDoc(doc(db, "users", userToDelete.uid));

      // Log the activity
      await addDoc(collection(db, "activities"), {
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName,
        action: `Deleted user ${userToDelete.displayName}`,
        details: `User ${userToDelete.email} was removed from the system`,
        timestamp: serverTimestamp(),
        type: "warning",
      });

      toast.success(`User ${userToDelete.displayName} deleted`);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleEditUser = (user: User) => {
    setEditFormData({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setEditDialogOpen(true);
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!editFormData.displayName) {
      toast.error("Display name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", editFormData.uid);
      await updateDoc(userRef, {
        displayName: editFormData.displayName,
        role: editFormData.role,
        isActive: editFormData.isActive,
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await addDoc(collection(db, "activities"), {
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        userName: currentUser?.displayName,
        action: `Updated user ${editFormData.displayName}`,
        details: `User information was updated`,
        timestamp: serverTimestamp(),
        type: "info",
      });

      toast.success(`User ${editFormData.displayName} updated successfully`);
      setEditDialogOpen(false);
      setEditFormData({ uid: "" });
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_USERS]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
          {hasPermission(PERMISSIONS.CREATE_USERS) && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Active</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <UsersTable
          users={users}
          loading={loading}
          currentUserId={currentUser?.uid}
          onEditUser={hasPermission(PERMISSIONS.EDIT_USERS) ? handleEditUser : undefined}
          onDeleteUser={hasPermission(PERMISSIONS.DELETE_USERS) ? handleDeleteUser : undefined}
          onChangeRole={hasPermission(PERMISSIONS.MANAGE_ROLES) ? handleChangeRole : undefined}
        />

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDisplayName">Display Name</Label>
                <Input
                  id="editDisplayName"
                  value={editFormData.displayName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editFormData.role || "user"}
                  onValueChange={(value) => setEditFormData({ ...editFormData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="editIsActive">Active</Label>
                <Switch
                  id="editIsActive"
                  checked={editFormData.isActive ?? true}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {userToDelete?.displayName}? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGuard>
  );
}
