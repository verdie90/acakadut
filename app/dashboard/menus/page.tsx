"use client";

import { useState, useEffect } from "react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { db } from "@/lib/firebase";
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { MenuItem, DEFAULT_MENUS, PERMISSIONS } from "@/lib/rbac/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Menu,
  Home,
  Folder,
  Database,
  Activity,
  PieChart,
  Calendar,
  MessageSquare,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

// Available icons for selection
const AVAILABLE_ICONS = [
  { name: "LayoutDashboard", icon: LayoutDashboard },
  { name: "Users", icon: Users },
  { name: "FileText", icon: FileText },
  { name: "Settings", icon: Settings },
  { name: "BarChart3", icon: BarChart3 },
  { name: "Shield", icon: Shield },
  { name: "Menu", icon: Menu },
  { name: "Home", icon: Home },
  { name: "Folder", icon: Folder },
  { name: "Database", icon: Database },
  { name: "Activity", icon: Activity },
  { name: "PieChart", icon: PieChart },
  { name: "Calendar", icon: Calendar },
  { name: "MessageSquare", icon: MessageSquare },
  { name: "MessageCircle", icon: MessageCircle },
  { name: "HelpCircle", icon: HelpCircle },
];

// Available permissions - dynamically built from PERMISSIONS constant
const AVAILABLE_PERMISSIONS = [
  { value: "none", label: "No Permission Required" },
  ...Object.entries(PERMISSIONS).map(([key, value]) => ({
    value: value,
    label: key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" "),
  })),
];

interface MenuFormData {
  title: string;
  href: string;
  icon: string;
  permission: string;
  order: number;
  isActive: boolean;
}

const defaultFormData: MenuFormData = {
  title: "",
  href: "/dashboard/",
  icon: "LayoutDashboard",
  permission: "",
  order: 0,
  isActive: true,
};

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Realtime listener for menus
  useEffect(() => {
    const menusQuery = query(collection(db, "menus"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      menusQuery,
      (snapshot) => {
        const menusList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MenuItem[];
        
        // Deduplicate menus by href
        const seenHrefs = new Set<string>();
        const deduplicatedMenus = menusList.filter((menu) => {
          if (seenHrefs.has(menu.href)) return false;
          seenHrefs.add(menu.href);
          return true;
        });
        
        setMenus(deduplicatedMenus);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching menus:", error);
        toast.error("Failed to fetch menus");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Initialize menus from defaults - using setDoc with explicit ID for consistency
  const initializeDefaultMenus = async () => {
    try {
      setIsSubmitting(true);
      for (const menu of DEFAULT_MENUS) {
        const { id, ...menuData } = menu;
        await setDoc(doc(db, "menus", id), {
          ...menuData,
          createdAt: new Date(),
        });
      }
      toast.success("Default menus initialized successfully");
    } catch (error) {
      console.error("Error initializing menus:", error);
      toast.error("Failed to initialize menus");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a slug from title for menu ID
  const generateMenuId = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Handle form submit (create/update)
  const handleSubmit = async () => {
    if (!formData.title || !formData.href) {
      toast.error("Title and URL are required");
      return;
    }

    try {
      setIsSubmitting(true);

      if (selectedMenu) {
        // Update existing menu
        await updateDoc(doc(db, "menus", selectedMenu.id), {
          ...formData,
          updatedAt: new Date(),
        });
        toast.success("Menu updated successfully");
      } else {
        // Create new menu with custom ID based on title
        const menuId = generateMenuId(formData.title);
        
        // Check if ID already exists
        const existingMenu = menus.find((m) => m.id === menuId);
        if (existingMenu) {
          toast.error("A menu with this title already exists");
          return;
        }
        
        await setDoc(doc(db, "menus", menuId), {
          ...formData,
          createdAt: new Date(),
        });
        toast.success("Menu created successfully");
      }

      setDialogOpen(false);
      setSelectedMenu(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error saving menu:", error);
      toast.error("Failed to save menu");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedMenu) return;

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "menus", selectedMenu.id));
      toast.success("Menu deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedMenu(null);
    } catch (error) {
      console.error("Error deleting menu:", error);
      toast.error("Failed to delete menu");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle menu active status
  const toggleMenuActive = async (menu: MenuItem) => {
    try {
      await updateDoc(doc(db, "menus", menu.id), {
        isActive: !menu.isActive,
        updatedAt: new Date(),
      });
      toast.success(`Menu ${menu.isActive ? "disabled" : "enabled"}`);
    } catch (error) {
      console.error("Error toggling menu:", error);
      toast.error("Failed to update menu");
    }
  };

  // Open edit dialog
  const openEditDialog = (menu: MenuItem) => {
    setSelectedMenu(menu);
    setFormData({
      title: menu.title,
      href: menu.href,
      icon: menu.icon,
      permission: menu.permission || "",
      order: menu.order,
      isActive: menu.isActive,
    });
    setDialogOpen(true);
  };

  // Open create dialog
  const openCreateDialog = () => {
    setSelectedMenu(null);
    setFormData({
      ...defaultFormData,
      order: menus.length > 0 ? Math.max(...menus.map((m) => m.order)) + 1 : 0,
    });
    setDialogOpen(true);
  };

  // Get icon component
  const getIconComponent = (iconName: string): LucideIcon => {
    const found = AVAILABLE_ICONS.find((i) => i.name === iconName);
    return found ? found.icon : LayoutDashboard;
  };

  return (
    <PermissionGuard permissions={[PERMISSIONS.MANAGE_MENUS]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
            <p className="text-muted-foreground">
              Configure navigation menus and their access permissions
            </p>
          </div>
          <div className="flex gap-2">
            {menus.length === 0 && (
              <Button
                variant="outline"
                onClick={initializeDefaultMenus}
                disabled={isSubmitting}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Initialize Defaults
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Menu
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedMenu ? "Edit Menu" : "Create New Menu"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedMenu
                      ? "Update the menu item details"
                      : "Add a new navigation menu item"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Menu title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="href">URL Path</Label>
                    <Input
                      id="href"
                      value={formData.href}
                      onChange={(e) =>
                        setFormData({ ...formData, href: e.target.value })
                      }
                      placeholder="/dashboard/page"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Select
                      value={formData.icon}
                      onValueChange={(value) =>
                        setFormData({ ...formData, icon: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                          <SelectItem key={name} value={name}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="permission">Required Permission</Label>
                    <Select
                      value={formData.permission || "none"}
                      onValueChange={(value) =>
                        setFormData({ ...formData, permission: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_PERMISSIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="order">Display Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Active</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : selectedMenu ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Navigation Menus</CardTitle>
            <CardDescription>
              Manage sidebar navigation items. Drag to reorder, toggle to enable/disable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : menus.length === 0 ? (
              <div className="text-center py-8">
                <Menu className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No menus configured</h3>
                <p className="text-muted-foreground">
                  Click &quot;Initialize Defaults&quot; to create default menus, or add a new menu.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Menu</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-center">Order</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menus.map((menu) => {
                    const Icon = getIconComponent(menu.icon);
                    return (
                      <TableRow key={menu.id}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{menu.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {menu.href}
                          </code>
                        </TableCell>
                        <TableCell>
                          {menu.permission ? (
                            <Badge variant="secondary">{menu.permission}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No restriction
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{menu.order}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={menu.isActive}
                            onCheckedChange={() => toggleMenuActive(menu)}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(menu)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedMenu(menu);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Menu</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{selectedMenu?.title}&quot;? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGuard>
  );
}
