"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  action: string;
  details: string;
  timestamp: Timestamp;
  type: "info" | "success" | "warning" | "error";
}

interface RealtimeActivityFeedProps {
  maxItems?: number;
  className?: string;
}

export function RealtimeActivityFeed({
  maxItems = 10,
  className,
}: RealtimeActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activitiesRef = collection(db, "activities");
    const q = query(
      activitiesRef,
      orderBy("timestamp", "desc"),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newActivities = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Activity[];
        setActivities(newActivities);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching activities:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxItems]);

  const getTypeBadge = (type: Activity["type"]) => {
    const variants: Record<Activity["type"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      info: { variant: "secondary", label: "Info" },
      success: { variant: "default", label: "Success" },
      warning: { variant: "outline", label: "Warning" },
      error: { variant: "destructive", label: "Error" },
    };
    return variants[type] || variants.info;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Activity Feed
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-4 pb-4",
                  index !== activities.length - 1 && "border-b"
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {activity.userName || activity.userEmail}
                    </span>
                    <Badge {...getTypeBadge(activity.type)}>
                      {getTypeBadge(activity.type).label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.action}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground">
                      {activity.details}
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground">
                  {activity.timestamp
                    ? format(activity.timestamp.toDate(), "MMM d, h:mm a")
                    : "Just now"}
                </time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
