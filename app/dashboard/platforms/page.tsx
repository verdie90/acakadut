"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import {
  Plus,
  QrCode,
  Wifi,
  WifiOff,
  Trash2,
  RefreshCw,
  Smartphone,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Scan,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWAUnofficialSession } from "@/hooks/use-wa-unofficial-session";
import { WhatsAppChat } from "@/components/whatsapp/wa-chat";
import { cn } from "@/lib/utils";

interface WADevice {
  id: string;
  userId: string;
  name: string;
  phoneNumber?: string;
  pushName?: string;
  profilePic?: string;
  platform?: string;
  status: "pending" | "connecting" | "connected" | "disconnected" | "error" | "qr_ready" | "initializing";
  createdAt: Timestamp;
  connectedAt?: Timestamp;
  lastSyncAt?: Timestamp;
  lastActiveAt?: Timestamp;
}

interface DeviceSlot {
  id: string;
  name: string;
  device: WADevice | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Menunggu", color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  connecting: { label: "Menghubungkan", color: "bg-blue-500", icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  connected: { label: "Terhubung", color: "bg-green-500", icon: <Wifi className="h-4 w-4" /> },
  disconnected: { label: "Terputus", color: "bg-gray-500", icon: <WifiOff className="h-4 w-4" /> },
  error: { label: "Error", color: "bg-red-500", icon: <AlertCircle className="h-4 w-4" /> },
  qr_ready: { label: "Scan QR", color: "bg-purple-500", icon: <QrCode className="h-4 w-4" /> },
  initializing: { label: "Memulai...", color: "bg-blue-500", icon: <Loader2 className="h-4 w-4 animate-spin" /> },
};

export default function WhatsAppUnofficialPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<WADevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxSlots] = useState(5); // Admin configurable
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<DeviceSlot | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<WADevice | null>(null);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [activeChat, setActiveChat] = useState<WADevice | null>(null); // For chat view

  // WA Unofficial session hook
  const {
    status: sessionStatus,
    qrCode,
    error: sessionError,
    isLoading: sessionLoading,
    sessionInfo,
    initializeSession,
    destroySession,
  } = useWAUnofficialSession(user?.uid, selectedSlot?.id, newDeviceName);

  // Fetch devices from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const devicesQuery = query(
      collection(db, "wa_unofficial_sessions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      devicesQuery,
      (snapshot) => {
        const devs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WADevice[];
        setDevices(devs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching devices:", error);
        toast.error("Gagal memuat daftar perangkat");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Generate slots
  const slots: DeviceSlot[] = Array.from({ length: maxSlots }, (_, i) => ({
    id: `slot-${i + 1}`,
    name: `Slot ${i + 1}`,
    device: devices[i] || null,
  }));

  // Handle add device click
  const handleAddDevice = (slot: DeviceSlot) => {
    setSelectedSlot(slot);
    setNewDeviceName(`Device ${slot.name}`);
    setQrDialogOpen(true);
  };

  // Handle start session
  const handleStartSession = async () => {
    await initializeSession();
  };

  // Handle dialog close
  const handleDialogClose = async () => {
    if (sessionStatus !== "connected" && sessionStatus !== "idle") {
      await destroySession();
    }
    setQrDialogOpen(false);
    setSelectedSlot(null);
    setNewDeviceName("");
  };

  // Handle delete device
  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    try {
      await fetch(`/api/platforms/wa-unofficial/session?sessionId=${deviceToDelete.id}`, {
        method: "DELETE",
      });
      toast.success("Perangkat berhasil dihapus");
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Gagal menghapus perangkat");
    } finally {
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  // Format date
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show Chat View when a device is selected for chatting
  if (activeChat) {
    return (
      <div className="space-y-4">
        {/* Back to devices header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveChat(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Perangkat
          </Button>
        </div>

        {/* Chat Component */}
        <WhatsAppChat
          sessionId={activeChat.id}
          deviceName={activeChat.name}
          phoneNumber={activeChat.phoneNumber}
          onBack={() => setActiveChat(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">WhatsApp Unofficial</h2>
          <p className="text-sm text-muted-foreground">
            Hubungkan akun WhatsApp Anda langsung via WhatsApp Web
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {devices.filter((d) => d.status === "connected").length} / {maxSlots} Terhubung
          </Badge>
        </div>
      </div>

      {/* Device Slots Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => (
          <Card
            key={slot.id}
            className={cn(
              "relative overflow-hidden transition-all",
              slot.device ? "border-primary/20" : "border-dashed"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{slot.name}</CardTitle>
                {slot.device && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {slot.device.status === "connected" && (
                        <DropdownMenuItem
                          onClick={() => setActiveChat(slot.device)}
                          className="text-green-600"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Buka Chat
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleAddDevice(slot)}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Reconnect
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setDeviceToDelete(slot.device);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {slot.device ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      slot.device.status === "connected" ? "bg-green-500/10" : "bg-gray-500/10"
                    )}>
                      <Smartphone className={cn(
                        "h-5 w-5",
                        slot.device.status === "connected" ? "text-green-500" : "text-gray-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{slot.device.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {slot.device.pushName || slot.device.phoneNumber 
                          ? `${slot.device.pushName || ""} ${slot.device.phoneNumber ? `(+${slot.device.phoneNumber})` : ""}`.trim()
                          : "Belum terhubung"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Connection Details */}
                  {slot.device.status === "connected" && (
                    <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                      <div className="flex justify-between">
                        <span>Session ID:</span>
                        <span className="font-mono truncate max-w-24">{slot.device.id.slice(-12)}</span>
                      </div>
                      {slot.device.lastSyncAt && (
                        <div className="flex justify-between">
                          <span>Last Sync:</span>
                          <span>{formatDate(slot.device.lastSyncAt)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge
                      className={cn(
                        "text-xs text-white",
                        statusConfig[slot.device.status]?.color || "bg-gray-500"
                      )}
                    >
                      <span className="mr-1">{statusConfig[slot.device.status]?.icon}</span>
                      {statusConfig[slot.device.status]?.label || slot.device.status}
                    </Badge>
                    {slot.device.status === "connected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-green-600 border-green-500 hover:bg-green-50"
                        onClick={() => setActiveChat(slot.device)}
                      >
                        <MessageCircle className="h-3 w-3" />
                        Chat
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(slot.device.lastSyncAt || slot.device.lastActiveAt || slot.device.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => handleAddDevice(slot)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tambah Akun</span>
                  </div>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Hubungkan WhatsApp
            </DialogTitle>
            <DialogDescription>
              {selectedSlot?.device
                ? "Reconnect perangkat ke WhatsApp Web"
                : "Scan QR code dengan WhatsApp untuk menghubungkan"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Device Name Input */}
            {sessionStatus === "idle" && (
              <div className="space-y-2">
                <Label htmlFor="device-name">Nama Perangkat</Label>
                <Input
                  id="device-name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Contoh: HP Kantor"
                />
              </div>
            )}

            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg min-h-70">
              {sessionStatus === "idle" ? (
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 mx-auto w-fit">
                    <Scan className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Klik tombol di bawah untuk memulai
                  </p>
                </div>
              ) : sessionStatus === "initializing" || sessionLoading ? (
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Mempersiapkan QR Code...
                  </p>
                </div>
              ) : sessionStatus === "qr_ready" && qrCode ? (
                <div className="space-y-3 text-center">
                  <div className="bg-white p-3 rounded-lg inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCode}
                      alt="WhatsApp QR Code"
                      className="w-56 h-56 object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    QR Code refresh otomatis setiap 15 detik
                  </p>
                </div>
              ) : sessionStatus === "connected" ? (
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-green-500/10 mx-auto w-fit">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <p className="font-medium text-green-600">Berhasil Terhubung!</p>
                    
                    {/* Session Details Card */}
                    <div className="bg-background rounded-lg p-4 text-left space-y-2 border">
                      {/* Device Name */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Nama Device:</span>
                        <span className="font-medium">{sessionInfo?.deviceName || newDeviceName}</span>
                      </div>
                      
                      {/* WhatsApp Name */}
                      {sessionInfo?.pushName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Nama WhatsApp:</span>
                          <span className="font-medium">{sessionInfo.pushName}</span>
                        </div>
                      )}
                      
                      {/* Phone Number */}
                      {sessionInfo?.phoneNumber && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Nomor:</span>
                          <span className="font-medium font-mono">+{sessionInfo.phoneNumber}</span>
                        </div>
                      )}
                      
                      {/* Session ID */}
                      {sessionInfo?.sessionId && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Session ID:</span>
                          <span className="font-mono text-xs truncate max-w-32">{sessionInfo.sessionId}</span>
                        </div>
                      )}
                      
                      {/* Last Sync */}
                      {sessionInfo?.lastSyncAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Sync:</span>
                          <span className="text-xs">
                            {new Date(sessionInfo.lastSyncAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {!sessionInfo?.pushName && !sessionInfo?.phoneNumber && (
                      <p className="text-sm text-muted-foreground">
                        Perangkat sudah siap digunakan
                      </p>
                    )}
                  </div>
                </div>
              ) : sessionStatus === "error" ? (
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-red-500/10 mx-auto w-fit">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600">Gagal Menghubungkan</p>
                    <p className="text-sm text-muted-foreground">
                      {sessionError || "Terjadi kesalahan"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {statusConfig[sessionStatus]?.label || sessionStatus}
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            {(sessionStatus === "idle" || sessionStatus === "qr_ready") && (
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">Cara menghubungkan:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Buka WhatsApp di HP Anda</li>
                  <li>Tap Menu ⋮ atau Settings ⚙️</li>
                  <li>Pilih &quot;Linked Devices&quot;</li>
                  <li>Tap &quot;Link a Device&quot;</li>
                  <li>Arahkan kamera ke QR code</li>
                </ol>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {sessionStatus === "idle" ? (
              <>
                <Button variant="outline" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button onClick={handleStartSession} disabled={!newDeviceName.trim()}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR
                </Button>
              </>
            ) : sessionStatus === "connected" ? (
              <Button onClick={handleDialogClose} className="w-full">
                Selesai
              </Button>
            ) : (
              <Button variant="outline" onClick={handleDialogClose} className="w-full">
                Batalkan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Perangkat?</AlertDialogTitle>
            <AlertDialogDescription>
              Perangkat &quot;{deviceToDelete?.name}&quot; akan dihapus dan terputus dari WhatsApp.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
