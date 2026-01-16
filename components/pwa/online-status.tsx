"use client";

import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";

// Use useSyncExternalStore for proper React 19 compatibility
function getOnlineStatus() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Custom store to track previous online status
let prevOnlineStatus: boolean | null = null;

function subscribe(callback: () => void) {
  const handleChange = () => {
    const currentStatus = navigator.onLine;
    
    // Show toast on status change
    if (prevOnlineStatus !== null && prevOnlineStatus !== currentStatus) {
      if (currentStatus) {
        toast.success("You're back online!", {
          icon: <Wifi className="h-4 w-4" />,
          description: "Your connection has been restored.",
        });
      } else {
        toast.warning("You're offline", {
          icon: <WifiOff className="h-4 w-4" />,
          description: "Some features may not be available.",
          duration: 5000,
        });
      }
    }
    
    prevOnlineStatus = currentStatus;
    callback();
  };
  
  // Initialize previous status
  if (prevOnlineStatus === null) {
    prevOnlineStatus = navigator.onLine;
  }
  
  window.addEventListener("online", handleChange);
  window.addEventListener("offline", handleChange);
  
  return () => {
    window.removeEventListener("online", handleChange);
    window.removeEventListener("offline", handleChange);
  };
}

export function OnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getOnlineStatus, () => true);

  // Initialize prevOnlineStatus on mount
  useEffect(() => {
    prevOnlineStatus = navigator.onLine;
  }, []);

  // Optional: Show persistent offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-yellow-500 px-4 py-2 text-sm font-medium text-yellow-950 shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span>Offline Mode</span>
      </div>
    );
  }

  return null;
}
