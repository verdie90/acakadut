"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AreaChartComponent, BarChartComponent, LineChartComponent } from "@/components/dashboard/charts";
import { RealtimeActivityFeed } from "@/components/dashboard/realtime-activity-feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, TrendingUp, DollarSign, Activity } from "lucide-react";

// Sample data for charts - In production, this would come from Firestore
const revenueData = [
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 5000 },
  { name: "Apr", revenue: 4500 },
  { name: "May", revenue: 6000 },
  { name: "Jun", revenue: 5500 },
  { name: "Jul", revenue: 7000 },
];

const performanceData = [
  { name: "Mon", current: 4000, previous: 2400 },
  { name: "Tue", current: 3000, previous: 1398 },
  { name: "Wed", current: 2000, previous: 9800 },
  { name: "Thu", current: 2780, previous: 3908 },
  { name: "Fri", current: 1890, previous: 4800 },
  { name: "Sat", current: 2390, previous: 3800 },
  { name: "Sun", current: 3490, previous: 4300 },
];

const userActivityData = [
  { name: "Week 1", users: 400 },
  { name: "Week 2", users: 300 },
  { name: "Week 3", users: 520 },
  { name: "Week 4", users: 480 },
];

interface DashboardStats {
  totalUsers: number;
  totalReports: number;
  activeUsers: number;
  revenue: number;
}

export default function DashboardPage() {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalReports: 0,
    activeUsers: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for users count
    const usersQuery = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const activeCount = snapshot.docs.filter(
        (doc) => doc.data().isActive !== false
      ).length;
      setStats((prev) => ({
        ...prev,
        totalUsers: snapshot.size,
        activeUsers: activeCount,
      }));
    });

    // Real-time listener for reports count
    const reportsQuery = query(collection(db, "reports"));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      setStats((prev) => ({
        ...prev,
        totalReports: snapshot.size,
      }));
    });

    // Simulated revenue - in production, this would come from a transactions collection
    setStats((prev) => ({
      ...prev,
      revenue: 45250,
    }));

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeReports();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.displayName}! Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          description="from last month"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          description="currently active"
          icon={Activity}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Total Reports"
          value={stats.totalReports}
          description="generated this month"
          icon={FileText}
          trend={{ value: 15, isPositive: true }}
        />
        {(isAdmin || isManager) && (
          <StatsCard
            title="Revenue"
            value={`$${stats.revenue.toLocaleString()}`}
            description="from last month"
            icon={DollarSign}
            trend={{ value: 20, isPositive: true }}
          />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AreaChartComponent
          data={revenueData}
          dataKey="revenue"
          title="Revenue Overview"
          description="Monthly revenue for the current year"
          color="#8884d8"
        />
        <LineChartComponent
          data={performanceData}
          dataKeys={[
            { key: "current", color: "#8884d8", name: "This Week" },
            { key: "previous", color: "#82ca9d", name: "Last Week" },
          ]}
          title="Performance Comparison"
          description="Weekly performance metrics"
        />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarChartComponent
            data={userActivityData}
            dataKey="users"
            title="User Activity"
            description="Weekly active users"
            color="#00C49F"
          />
        </div>
        <RealtimeActivityFeed maxItems={5} />
      </div>

      {/* Quick Actions - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/dashboard/users"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-muted-foreground">
                    View and edit users
                  </div>
                </div>
              </a>
              <a
                href="/dashboard/reports"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">View Reports</div>
                  <div className="text-sm text-muted-foreground">
                    Access all reports
                  </div>
                </div>
              </a>
              <a
                href="/dashboard/analytics"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Analytics</div>
                  <div className="text-sm text-muted-foreground">
                    View detailed analytics
                  </div>
                </div>
              </a>
              <a
                href="/dashboard/roles"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Manage Roles</div>
                  <div className="text-sm text-muted-foreground">
                    Configure permissions
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
