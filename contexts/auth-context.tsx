"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  getDocs,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, UserRole, RoleConfig, MenuItem, DEFAULT_ROLES, DEFAULT_MENUS, PERMISSIONS } from "@/lib/rbac/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  roles: RoleConfig[];
  menus: MenuItem[];
  userMenus: MenuItem[];
  userPermissions: string[]; // Current user's permissions from their role
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasMenuAccess: (menuId: string) => boolean;
  refreshRoles: () => Promise<void>; // Force refresh roles from Firestore
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to initialize default roles and menus in Firestore
const initializeDefaultsIfNeeded = async (dbInstance: typeof db) => {
  // Check and sync menus - add any missing menus from defaults
  const menusSnapshot = await getDocs(collection(dbInstance, "menus"));
  const existingMenuIds = new Set(menusSnapshot.docs.map((d) => d.id));
  const allDefaultMenuIds = DEFAULT_MENUS.map((m) => m.id);
  const defaultMenuHrefs = new Set(DEFAULT_MENUS.map((m) => m.href));
  
  // Remove duplicate menus (menus with same href but wrong ID - likely auto-generated)
  const seenHrefs = new Set<string>();
  for (const docSnap of menusSnapshot.docs) {
    const menuData = docSnap.data();
    const href = menuData.href;
    
    // If this is a duplicate href or has auto-generated ID for a default menu href
    if (seenHrefs.has(href)) {
      // Delete duplicate
      await deleteDoc(doc(dbInstance, "menus", docSnap.id));
      console.log(`Deleted duplicate menu: ${docSnap.id} (${href})`);
    } else if (defaultMenuHrefs.has(href) && !allDefaultMenuIds.includes(docSnap.id)) {
      // This menu has a default href but wrong ID (auto-generated), delete it
      await deleteDoc(doc(dbInstance, "menus", docSnap.id));
      console.log(`Deleted menu with wrong ID: ${docSnap.id} (${href})`);
    } else {
      seenHrefs.add(href);
    }
  }
  
  // Add any missing default menus
  let menusAdded = false;
  for (const menu of DEFAULT_MENUS) {
    if (!existingMenuIds.has(menu.id)) {
      const { id, ...menuData } = menu;
      await setDoc(doc(dbInstance, "menus", id), {
        ...menuData,
        createdAt: serverTimestamp(),
      });
      console.log(`Menu "${menu.id}" added`);
      menusAdded = true;
    }
  }

  // Check if roles exist
  const rolesSnapshot = await getDocs(collection(dbInstance, "roles"));
  if (rolesSnapshot.empty) {
    // Initialize default roles
    for (const role of DEFAULT_ROLES) {
      const { id, ...roleData } = role;
      await setDoc(doc(dbInstance, "roles", id), {
        ...roleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    console.log("Default roles initialized");
  } else if (menusAdded) {
    // If new menus were added, update admin role to include new menus
    const adminRoleDoc = rolesSnapshot.docs.find((d) => d.id === "admin");
    if (adminRoleDoc) {
      const adminData = adminRoleDoc.data();
      const currentMenuIds = adminData.menuIds || [];
      const newMenuIds = allDefaultMenuIds.filter((id) => !currentMenuIds.includes(id));
      
      if (newMenuIds.length > 0) {
        await setDoc(
          doc(dbInstance, "roles", "admin"),
          {
            menuIds: [...currentMenuIds, ...newMenuIds],
            permissions: Object.values(PERMISSIONS),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log(`Admin role updated with new menus: ${newMenuIds.join(", ")}`);
      }
    }
  }
};

// Helper function to create user document (outside component to avoid hoisting issues)
const createUserDocumentHelper = async (
  firebaseUser: FirebaseUser,
  dbInstance: typeof db
) => {
  const userDocRef = doc(dbInstance, "users", firebaseUser.uid);
  
  // First, ensure defaults are initialized
  await initializeDefaultsIfNeeded(dbInstance);
  
  // Check if this is the first user (make them admin)
  const usersQuery = query(collection(dbInstance, "users"));
  const usersSnapshot = await getDocs(usersQuery);
  const isFirstUser = usersSnapshot.empty;

  // Get the appropriate role config to ensure user gets proper menu access
  const roleId = isFirstUser ? "admin" : "user";
  const roleDoc = await getDoc(doc(dbInstance, "roles", roleId));
  const roleData = roleDoc.exists() ? roleDoc.data() : DEFAULT_ROLES.find(r => r.id === roleId);

  const userData = {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
    photoURL: firebaseUser.photoURL || null,
    role: roleId,
    // Store the menuIds from the role for quick access
    menuIds: roleData?.menuIds || (roleId === "admin" ? DEFAULT_MENUS.map(m => m.id) : ["dashboard"]),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
  };

  await setDoc(userDocRef, userData);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES);
  const [menus, setMenus] = useState<MenuItem[]>(DEFAULT_MENUS);
  const [rolesInitialized, setRolesInitialized] = useState(false);

  // Initialize defaults on first load
  useEffect(() => {
    const initDefaults = async () => {
      try {
        await initializeDefaultsIfNeeded(db);
        setRolesInitialized(true);
      } catch (err) {
        console.error("Error initializing defaults:", err);
        setRolesInitialized(true); // Continue anyway with defaults
      }
    };
    initDefaults();
  }, []);

  // Fetch menus from Firestore (for dynamic menu management)
  useEffect(() => {
    const menusQuery = query(collection(db, "menus"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      menusQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedMenus = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as MenuItem[];
          setMenus(fetchedMenus);
        }
      },
      (err) => {
        console.error("Error fetching menus:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch roles from Firestore (for dynamic role management) - with better sync
  useEffect(() => {
    if (!rolesInitialized) return;
    
    const unsubscribe = onSnapshot(
      collection(db, "roles"),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedRoles = snapshot.docs.map((docSnap) => ({
            id: docSnap.id as UserRole,
            name: docSnap.data().name || docSnap.id,
            description: docSnap.data().description || "",
            permissions: docSnap.data().permissions || [],
            menuIds: docSnap.data().menuIds || [],
          })) as RoleConfig[];
          setRoles(fetchedRoles);
          console.log("Roles synced from Firestore:", fetchedRoles.map(r => r.id));
        } else {
          // Use defaults if Firestore is empty
          setRoles(DEFAULT_ROLES);
        }
      },
      (err) => {
        console.error("Error fetching roles:", err);
        // Fallback to defaults on error
        setRoles(DEFAULT_ROLES);
      }
    );

    return () => unsubscribe();
  }, [rolesInitialized]);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // Listen to user document in real-time
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userUnsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName: userData.displayName || firebaseUser.displayName || "",
                photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
                role: userData.role || "user",
                createdAt: userData.createdAt?.toDate() || new Date(),
                updatedAt: userData.updatedAt?.toDate() || new Date(),
                isActive: userData.isActive ?? true,
              });
            } else {
              // Create user document if it doesn't exist
              createUserDocumentHelper(firebaseUser, db);
            }
            setLoading(false);
          },
          (err) => {
            console.error("Error fetching user:", err);
            setError("Failed to fetch user data");
            setLoading(false);
          }
        );

        return () => userUnsubscribe();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await createUserDocumentHelper(result.user, db);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign up";
      setError(errorMessage);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(errorMessage);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to logout";
      setError(errorMessage);
      throw err;
    }
  };

  // Force refresh roles from Firestore
  const refreshRoles = async () => {
    try {
      const rolesSnapshot = await getDocs(collection(db, "roles"));
      if (!rolesSnapshot.empty) {
        const fetchedRoles = rolesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id as UserRole,
          name: docSnap.data().name || docSnap.id,
          description: docSnap.data().description || "",
          permissions: docSnap.data().permissions || [],
          menuIds: docSnap.data().menuIds || [],
        })) as RoleConfig[];
        setRoles(fetchedRoles);
      }
    } catch (err) {
      console.error("Error refreshing roles:", err);
    }
  };

  // Get current user's permissions from their role (synced from Firestore)
  const userPermissions = React.useMemo(() => {
    if (!user) return [];
    // Admin has all permissions
    if (user.role === "admin") {
      return Object.values(PERMISSIONS);
    }
    const userRole = roles.find((r) => r.id === user.role);
    return userRole?.permissions || [];
  }, [user, roles]);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Admin has all permissions
    if (user.role === "admin") return true;
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    // Admin has all permissions
    if (user.role === "admin") return true;
    return permissions.some((p) => userPermissions.includes(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    // Admin has all permissions
    if (user.role === "admin") return true;
    return permissions.every((p) => userPermissions.includes(p));
  };

  const hasMenuAccess = (menuId: string): boolean => {
    if (!user) return false;
    // Admin has access to all menus
    if (user.role === "admin") return true;
    const userRole = roles.find((r) => r.id === user.role);
    // If role has menuIds configured, use them; otherwise check permission
    if (userRole?.menuIds && userRole.menuIds.length > 0) {
      return userRole.menuIds.includes(menuId);
    }
    // Fallback: check if user has permission for the menu
    const menu = menus.find((m) => m.id === menuId);
    if (!menu) return false;
    return !menu.permission || hasPermission(menu.permission);
  };

  // Get menus accessible by current user based on role
  const userMenus = React.useMemo(() => {
    if (!user) return [];
    
    // Deduplicate menus by href (in case there are duplicate entries in Firestore)
    const seenHrefs = new Set<string>();
    const deduplicatedMenus = menus.filter((menu) => {
      if (seenHrefs.has(menu.href)) return false;
      seenHrefs.add(menu.href);
      return true;
    });
    
    // Admin gets all active menus
    if (user.role === "admin") {
      return deduplicatedMenus.filter((menu) => menu.isActive).sort((a, b) => a.order - b.order);
    }
    
    const userRole = roles.find((r) => r.id === user.role);
    if (!userRole) return [];
    
    // Filter menus based on role's menuIds OR permissions (fallback)
    const hasMenuIds = userRole.menuIds && userRole.menuIds.length > 0;
    
    return deduplicatedMenus
      .filter((menu) => {
        if (!menu.isActive) return false;
        
        // If role has menuIds configured, use them
        if (hasMenuIds) {
          return userRole.menuIds?.includes(menu.id);
        }
        
        // Fallback: check permission
        return !menu.permission || userRole.permissions.includes(menu.permission);
      })
      .sort((a, b) => a.order - b.order);
  }, [user, roles, menus]);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    roles,
    menus,
    userMenus,
    userPermissions,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasMenuAccess,
    refreshRoles,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    isUser: user?.role === "user",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { PERMISSIONS };
