"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { PERMISSIONS } from "@/lib/rbac/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  MessageCircle,
  RefreshCw,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Key,
  Shield,
  Webhook,
} from "lucide-react";

interface WebhookMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  messageType: string;
  status: string;
  timestamp: Timestamp;
  waId?: string;
  profileName?: string;
  rawData?: Record<string, unknown>;
}

interface WebhookLog {
  id: string;
  event: string;
  status: string;
  timestamp: Timestamp;
  payload?: Record<string, unknown>;
}

export default function WhatsAppOfficialPage() {
  const [messages, setMessages] = useState<WebhookMessage[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyToken, setVerifyToken] = useState("your-verify-token");
  const webhookUrl = "/api/webhook/whatsapp-official";

  useEffect(() => {
    // Listen to webhook messages
    const messagesQuery = query(
      collection(db, "whatsapp_official_messages"),
      orderBy("timestamp", "desc")
    );

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WebhookMessage[];
        setMessages(msgs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        toast.error("Failed to fetch messages");
        setLoading(false);
      }
    );

    // Listen to webhook logs
    const logsQuery = query(
      collection(db, "whatsapp_official_logs"),
      orderBy("timestamp", "desc")
    );

    const unsubscribeLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WebhookLog[];
        setLogs(logData);
      },
      (error) => {
        console.error("Error fetching logs:", error);
        toast.error("Failed to fetch logs");
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeLogs();
    };
  }, []);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied to clipboard");
  };

  const copyVerifyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    toast.success("Verify token copied to clipboard");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(date);
  };

  return (
    <PermissionGuard permissions={[PERMISSIONS.VIEW_WHATSAPP_OFFICIAL]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp Business API</h1>
            <p className="text-muted-foreground">
              Official WhatsApp Business API integration with Meta Cloud API
            </p>
          </div>
        </div>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Meta Webhook Configuration
            </CardTitle>
            <CardDescription>
              Configure these settings in your Meta Developer Console for WhatsApp Business API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Callback URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifyToken">Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="verifyToken"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyVerifyToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold">{messages.length}</div>
                <div className="text-sm text-muted-foreground">Total Messages</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-green-500">
                  {messages.filter((m) => m.status === "received").length}
                </div>
                <div className="text-sm text-muted-foreground">Received</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-blue-500">
                  {logs.filter((l) => l.event === "messages").length}
                </div>
                <div className="text-sm text-muted-foreground">Webhook Events</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-red-500">
                  {logs.filter((l) => l.status === "error").length}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <Shield className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Setup Instructions</h4>
                <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal ml-4 mt-2 space-y-1">
                  <li>Go to Meta Developer Console → Your App → WhatsApp → Configuration</li>
                  <li>Set the Callback URL to the URL shown above</li>
                  <li>Set the Verify Token to match the token above</li>
                  <li>Subscribe to the webhooks: messages, messaging_postbacks</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Messages and Logs */}
        <Tabs defaultValue="messages">
          <TabsList>
            <TabsTrigger value="messages" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Key className="h-4 w-4" />
              Webhook Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Incoming Messages</CardTitle>
                <CardDescription>
                  Messages received from WhatsApp Business API
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
                    <p className="text-muted-foreground">
                      Configure your WhatsApp Business API webhook to start receiving messages.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.slice(0, 50).map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(msg.status)}
                              <Badge variant={msg.status === "received" ? "default" : "secondary"}>
                                {msg.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{msg.from}</TableCell>
                          <TableCell>{msg.profileName || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{msg.message}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{msg.messageType || "text"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(msg.timestamp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Logs</CardTitle>
                <CardDescription>
                  All webhook events received from Meta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No logs yet</h3>
                    <p className="text-muted-foreground">
                      Webhook events will appear here once configured.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.slice(0, 100).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <Badge variant={log.status === "success" ? "default" : "destructive"}>
                                {log.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.event}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(log.timestamp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
