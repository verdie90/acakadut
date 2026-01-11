// RBAC Types and Constants
export type UserRole = "admin" | "manager" | "user";

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface RoleConfig {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
}

// Default permissions
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_ANALYTICS: "view_analytics",
  
  // Users
  VIEW_USERS: "view_users",
  CREATE_USERS: "create_users",
  EDIT_USERS: "edit_users",
  DELETE_USERS: "delete_users",
  MANAGE_ROLES: "manage_roles",
  
  // Reports
  VIEW_REPORTS: "view_reports",
  CREATE_REPORTS: "create_reports",
  EXPORT_REPORTS: "export_reports",
  
  // Settings
  VIEW_SETTINGS: "view_settings",
  EDIT_SETTINGS: "edit_settings",
  
  // Data
  VIEW_ALL_DATA: "view_all_data",
  VIEW_OWN_DATA: "view_own_data",
  EDIT_OWN_DATA: "edit_own_data",
} as const;

// Default role configurations
export const DEFAULT_ROLES: RoleConfig[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full access to all features and settings",
    permissions: Object.values(PERMISSIONS),
  },
  {
    id: "manager",
    name: "Manager",
    description: "Can view reports, analytics, and manage data",
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.CREATE_REPORTS,
      PERMISSIONS.EXPORT_REPORTS,
      PERMISSIONS.VIEW_ALL_DATA,
      PERMISSIONS.VIEW_OWN_DATA,
      PERMISSIONS.EDIT_OWN_DATA,
    ],
  },
  {
    id: "user",
    name: "User",
    description: "Basic access to personal data and dashboard",
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_OWN_DATA,
      PERMISSIONS.EDIT_OWN_DATA,
    ],
  },
];

// User interface
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Activity log interface
export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: Date;
}

// Report interface
export interface Report {
  id: string;
  title: string;
  description: string;
  type: "sales" | "users" | "performance" | "custom";
  createdBy: string;
  createdAt: Date;
  data: Record<string, unknown>;
}
