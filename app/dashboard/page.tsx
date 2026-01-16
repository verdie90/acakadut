"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
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
  const { t } = useLanguage();
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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.welcome")}, {user?.displayName}! {t("dashboard.whatsHappening")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("dashboard.totalUsers")}
          value={stats.totalUsers}
          description={t("dashboard.fromLastMonth")}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title={t("dashboard.activeUsers")}
          value={stats.activeUsers}
          description={t("dashboard.currentlyActive")}
          icon={Activity}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title={t("dashboard.totalReports")}
          value={stats.totalReports}
          description={t("dashboard.generatedThisMonth")}
          icon={FileText}
          trend={{ value: 15, isPositive: true }}
        />
        {(isAdmin || isManager) && (
          <StatsCard
            title={t("dashboard.revenue")}
            value={`$${stats.revenue.toLocaleString()}`}
            description={t("dashboard.fromLastMonth")}
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
          title={t("dashboard.revenueOverview")}
          description={t("dashboard.monthlyRevenue")}
          color="oklch(0.65 0.22 265)"
        />
        <LineChartComponent
          data={performanceData}
          dataKeys={[
            { key: "current", color: "oklch(0.65 0.22 265)", name: t("dashboard.thisWeek") },
            { key: "previous", color: "oklch(0.7 0.18 170)", name: t("dashboard.lastWeek") },
          ]}
          title={t("dashboard.performanceComparison")}
          description={t("dashboard.weeklyMetrics")}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarChartComponent
            data={userActivityData}
            dataKey="users"
            title={t("dashboard.userActivity")}
            description={t("dashboard.weeklyActiveUsers")}
            color="oklch(0.7 0.18 170)"
          />
        </div>
        <RealtimeActivityFeed maxItems={5} />
      </div>

      {/* Quick Actions - Admin Only */}
      {isAdmin && (
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>
              {t("dashboard.frequentlyUsed")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/dashboard/users"
                className="group flex items-center gap-3 rounded-xl border border-border/50 p-4 transition-all duration-200 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 transition-transform group-hover:scale-110">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{t("dashboard.manageUsers")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("dashboard.viewEditUsers")}
                  </div>
                </div>
              </a>
              <a
                href="/dashboard/reports"
                className="group flex items-center gap-3 rounded-xl border border-border/50 p-4 transition-all duration-200 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 transition-transform group-hover:scale-110">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{t("dashboard.viewReports")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("dashboard.accessReports")}
                  </div>
                </div>
              </a>
              <a
                href="/dashboard/analytics"
                className="group flex items-center gap-3 rounded-xl border border-border/50 p-4 transition-all duration-200 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 transition-transform group-hover:scale-110">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{t("dashboard.analytics")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("dashboard.viewAnalytics")}
                  </div>
                </div>
              </a>
              <a
                href="/dashboard/roles"
                className="group flex items-center gap-3 rounded-xl border border-border/50 p-4 transition-all duration-200 hover:bg-accent/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 transition-transform group-hover:scale-110">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{t("dashboard.manageRoles")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("dashboard.configurePermissions")}
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

