"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, PERMISSIONS } from "@/contexts/auth-context";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { FileText, Download, Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: string;
  title: string;
  description: string;
  type: "sales" | "users" | "performance" | "custom";
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  status: "draft" | "published";
}

const reportTypes = {
  sales: { label: "Sales", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  users: { label: "Users", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  performance: { label: "Performance", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
  custom: { label: "Custom", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
};

export default function ReportsPage() {
  const { user, hasPermission } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const reportsQuery = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(
      reportsQuery,
      (snapshot) => {
        const reportsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Report[];
        setReports(reportsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching reports:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredReports = reports.filter(
    (report) =>
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateReport = async () => {
    if (!hasPermission(PERMISSIONS.CREATE_REPORTS)) return;

    try {
      await addDoc(collection(db, "reports"), {
        title: "New Report",
        description: "Report description",
        type: "custom",
        createdBy: user?.uid,
        createdByName: user?.displayName,
        createdAt: serverTimestamp(),
        status: "draft",
      });

      // Log activity
      await addDoc(collection(db, "activities"), {
        userId: user?.uid,
        userEmail: user?.email,
        userName: user?.displayName,
        action: "Created a new report",
        details: "New report draft created",
        timestamp: serverTimestamp(),
        type: "success",
      });
    } catch (error) {
      console.error("Error creating report:", error);
    }
  };

  const handleExportReport = (report: Report) => {
    if (!hasPermission(PERMISSIONS.EXPORT_REPORTS)) return;
    // In production, this would generate and download a report
    console.log("Exporting report:", report.id);
  };

  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_REPORTS]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">
              View and manage system reports
            </p>
          </div>
          {hasPermission(PERMISSIONS.CREATE_REPORTS) && (
            <Button onClick={handleCreateReport}>
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(reportTypes).map(([key, value]) => {
            const count = reports.filter((r) => r.type === key).length;
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {value.label} Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>All Reports</CardTitle>
                <CardDescription>
                  A list of all reports in the system
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-25">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <span>No reports found</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {report.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={reportTypes[report.type].color}>
                            {reportTypes[report.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              report.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.createdByName}</TableCell>
                        <TableCell>
                          {format(report.createdAt, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasPermission(PERMISSIONS.EXPORT_REPORTS) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExportReport(report)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
