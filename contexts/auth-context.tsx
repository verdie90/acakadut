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
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, UserRole, RoleConfig, DEFAULT_ROLES, PERMISSIONS } from "@/lib/rbac/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  roles: RoleConfig[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create user document (outside component to avoid hoisting issues)
const createUserDocumentHelper = async (
  firebaseUser: FirebaseUser,
  dbInstance: typeof db
) => {
  const userDocRef = doc(dbInstance, "users", firebaseUser.uid);
  
  // Check if this is the first user (make them admin)
  const usersQuery = query(collection(dbInstance, "users"));
  const usersSnapshot = await getDocs(usersQuery);
  const isFirstUser = usersSnapshot.empty;

  const userData = {
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
    photoURL: firebaseUser.photoURL || null,
    role: isFirstUser ? "admin" : "user",
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

  // Fetch roles from Firestore (for dynamic role management)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "roles"),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedRoles = snapshot.docs.map((doc) => ({
            id: doc.id as UserRole,
            ...doc.data(),
          })) as RoleConfig[];
          setRoles(fetchedRoles);
        }
      },
      (err) => {
        console.error("Error fetching roles:", err);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const userRole = roles.find((r) => r.id === user.role);
    return userRole?.permissions.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    roles,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
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
