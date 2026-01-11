"use client";

import { AreaChartComponent, LineChartComponent, BarChartComponent, PieChartComponent } from "@/components/dashboard/charts";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PermissionGuard, PERMISSIONS } from "@/components/auth/permission-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Eye, Clock, MousePointer } from "lucide-react";

// Sample analytics data
const trafficData = [
  { name: "Mon", visitors: 2400, pageViews: 4000 },
  { name: "Tue", visitors: 1398, pageViews: 3000 },
  { name: "Wed", visitors: 9800, pageViews: 2000 },
  { name: "Thu", visitors: 3908, pageViews: 2780 },
  { name: "Fri", visitors: 4800, pageViews: 1890 },
  { name: "Sat", visitors: 3800, pageViews: 2390 },
  { name: "Sun", visitors: 4300, pageViews: 3490 },
];

const deviceData = [
  { name: "Desktop", value: 55 },
  { name: "Mobile", value: 35 },
  { name: "Tablet", value: 10 },
];

const sourceData = [
  { name: "Direct", visits: 4000 },
  { name: "Social", visits: 3000 },
  { name: "Organic", visits: 2000 },
  { name: "Referral", visits: 2780 },
  { name: "Email", visits: 1890 },
];

const conversionData = [
  { name: "Week 1", rate: 2.4 },
  { name: "Week 2", rate: 3.1 },
  { name: "Week 3", rate: 2.8 },
  { name: "Week 4", rate: 4.2 },
  { name: "Week 5", rate: 3.9 },
  { name: "Week 6", rate: 4.8 },
];

export default function AnalyticsPage() {
  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_ANALYTICS]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed insights and performance metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Visitors"
            value="45,231"
            description="from last month"
            icon={Users}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatsCard
            title="Page Views"
            value="125,823"
            description="from last month"
            icon={Eye}
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatsCard
            title="Avg. Session Duration"
            value="4m 32s"
            description="from last month"
            icon={Clock}
            trend={{ value: 3.1, isPositive: false }}
          />
          <StatsCard
            title="Bounce Rate"
            value="42.3%"
            description="from last month"
            icon={MousePointer}
            trend={{ value: 5.4, isPositive: true }}
          />
        </div>

        {/* Traffic Overview */}
        <LineChartComponent
          data={trafficData}
          dataKeys={[
            { key: "visitors", color: "#8884d8", name: "Visitors" },
            { key: "pageViews", color: "#82ca9d", name: "Page Views" },
          ]}
          title="Traffic Overview"
          description="Daily visitors and page views for the past week"
          height={350}
        />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PieChartComponent
            data={deviceData}
            dataKey="value"
            title="Device Breakdown"
            description="Traffic by device type"
          />
          <BarChartComponent
            data={sourceData}
            dataKey="visits"
            title="Traffic Sources"
            description="Visits by traffic source"
            color="#00C49F"
          />
        </div>

        {/* Conversion Rate */}
        <AreaChartComponent
          data={conversionData}
          dataKey="rate"
          title="Conversion Rate Trend"
          description="Weekly conversion rate percentage"
          color="#FF8042"
          height={300}
        />

        {/* Top Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { page: "/dashboard", views: 12453, change: 12.3 },
                { page: "/products", views: 8234, change: -5.2 },
                { page: "/about", views: 6123, change: 8.7 },
                { page: "/contact", views: 4521, change: 15.4 },
                { page: "/blog", views: 3892, change: -2.1 },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.page}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      {item.views.toLocaleString()} views
                    </span>
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        item.change > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {item.change > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {Math.abs(item.change)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
