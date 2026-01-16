// RBAC Types and Constants
export type UserRole = "admin" | "manager" | "user" | string;

export interface Permission {
  id: string;
  name: string;
  description: string;
}

// Menu item interface for dynamic navigation
export interface MenuItem {
  id: string;
  title: string;
  href: string;
  icon: string; // Icon name from lucide-react
  permission?: string;
  order: number;
  isActive: boolean;
  parentId?: string; // For nested menus
  children?: MenuItem[];
}

// Role configuration with menu access
export interface RoleConfig {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
  menuIds: string[]; // Menu items accessible by this role
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
  DELETE_REPORTS: "delete_reports",
  EXPORT_REPORTS: "export_reports",
  
  // Settings
  VIEW_SETTINGS: "view_settings",
  EDIT_SETTINGS: "edit_settings",
  MANAGE_SETTINGS: "manage_settings",
  
  // Users
  MANAGE_USERS: "manage_users",
  
  // Menus
  MANAGE_MENUS: "manage_menus",
  
  // Data
  VIEW_ALL_DATA: "view_all_data",
  VIEW_OWN_DATA: "view_own_data",
  EDIT_OWN_DATA: "edit_own_data",
} as const;

// Default menu items
export const DEFAULT_MENUS: MenuItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    permission: PERMISSIONS.VIEW_DASHBOARD,
    order: 1,
    isActive: true,
  },
  {
    id: "analytics",
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: "BarChart3",
    permission: PERMISSIONS.VIEW_ANALYTICS,
    order: 2,
    isActive: true,
  },
  {
    id: "users",
    title: "Users",
    href: "/dashboard/users",
    icon: "Users",
    permission: PERMISSIONS.VIEW_USERS,
    order: 3,
    isActive: true,
  },
  {
    id: "reports",
    title: "Reports",
    href: "/dashboard/reports",
    icon: "FileText",
    permission: PERMISSIONS.VIEW_REPORTS,
    order: 4,
    isActive: true,
  },
  {
    id: "roles",
    title: "Roles & Permissions",
    href: "/dashboard/roles",
    icon: "Shield",
    permission: PERMISSIONS.MANAGE_ROLES,
    order: 5,
    isActive: true,
  },
  {
    id: "menus",
    title: "Menu Management",
    href: "/dashboard/menus",
    icon: "Menu",
    permission: PERMISSIONS.MANAGE_MENUS,
    order: 6,
    isActive: true,
  },
  {
    id: "settings",
    title: "Settings",
    href: "/dashboard/settings",
    icon: "Settings",
    permission: PERMISSIONS.VIEW_SETTINGS,
    order: 7,
    isActive: true,
  },
];

// Default role configurations
export const DEFAULT_ROLES: RoleConfig[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full access to all features and settings",
    permissions: Object.values(PERMISSIONS),
    menuIds: DEFAULT_MENUS.map((m) => m.id),
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
    menuIds: ["dashboard", "analytics", "users", "reports"],
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
    menuIds: ["dashboard"],
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
