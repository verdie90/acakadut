"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, PERMISSIONS } from "@/contexts/auth-context";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { UsersTable } from "@/components/dashboard/users-table";
import { User, UserRole } from "@/lib/rbac/types";
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

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

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
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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
    // This would open an edit modal/dialog
    toast.info(`Edit user: ${user.displayName}`);
  };

  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_USERS]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>

        <UsersTable
          users={users}
          loading={loading}
          currentUserId={currentUser?.uid}
          onEditUser={hasPermission(PERMISSIONS.EDIT_USERS) ? handleEditUser : undefined}
          onDeleteUser={hasPermission(PERMISSIONS.DELETE_USERS) ? handleDeleteUser : undefined}
          onChangeRole={hasPermission(PERMISSIONS.MANAGE_ROLES) ? handleChangeRole : undefined}
        />

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
