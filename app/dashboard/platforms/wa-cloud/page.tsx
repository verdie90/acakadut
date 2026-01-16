"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cloud, Settings, Key, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function WACloudPage() {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConnected] = useState(false);

  const handleConnect = () => {
    // TODO: Implement Meta Cloud API connection
    console.log("Connecting to Meta Cloud API...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp Cloud API</h2>
          <p className="text-muted-foreground">
            Hubungkan dengan Meta WhatsApp Cloud API untuk mengirim pesan bisnis
          </p>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1.5">
          {isConnected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terhubung
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" />
              Belum Terhubung
            </>
          )}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Konfigurasi API
            </CardTitle>
            <CardDescription>
              Masukkan kredensial dari Meta for Developers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input
                id="phoneNumberId"
                placeholder="Masukkan Phone Number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="Masukkan Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                placeholder="https://your-domain.com/api/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL untuk menerima notifikasi pesan masuk
              </p>
            </div>
            <Button onClick={handleConnect} className="w-full">
              <Cloud className="mr-2 h-4 w-4" />
              Hubungkan API
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Cara Mendapatkan Kredensial
            </CardTitle>
            <CardDescription>
              Langkah-langkah untuk mengkonfigurasi WhatsApp Cloud API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </div>
                <p>Buat aplikasi di Meta for Developers</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </div>
                <p>Aktifkan WhatsApp product pada aplikasi Anda</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </div>
                <p>Salin Phone Number ID dan Access Token</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  4
                </div>
                <p>Konfigurasi webhook untuk menerima pesan</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Buka Meta for Developers
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Fitur WhatsApp Cloud API</CardTitle>
          <CardDescription>
            Kemampuan yang tersedia dengan WhatsApp Cloud API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">📨 Pesan Template</h4>
              <p className="text-sm text-muted-foreground">
                Kirim pesan template yang sudah disetujui untuk notifikasi dan marketing
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">💬 Pesan Session</h4>
              <p className="text-sm text-muted-foreground">
                Balas pesan pelanggan dalam window 24 jam tanpa template
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">📎 Media Support</h4>
              <p className="text-sm text-muted-foreground">
                Kirim gambar, video, dokumen, dan audio dalam pesan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
