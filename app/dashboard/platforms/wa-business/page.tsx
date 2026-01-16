"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Server, Key, ExternalLink, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function WABusinessPage() {
  const [provider, setProvider] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isConnected] = useState(false);

  const handleConnect = () => {
    // TODO: Implement WhatsApp Business API connection
    console.log("Connecting to WhatsApp Business API...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp Business API</h2>
          <p className="text-muted-foreground">
            Integrasi dengan WhatsApp Business API melalui BSP (Business Solution Provider)
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
              <Server className="h-5 w-5" />
              Konfigurasi BSP
            </CardTitle>
            <CardDescription>
              Masukkan kredensial dari Business Solution Provider Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="360dialog">360dialog</SelectItem>
                  <SelectItem value="gupshup">Gupshup</SelectItem>
                  <SelectItem value="infobip">Infobip</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="messagebird">MessageBird</SelectItem>
                  <SelectItem value="vonage">Vonage</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                placeholder="https://waba.360dialog.io/v1"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Masukkan API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Nomor WhatsApp</Label>
              <Input
                id="phoneNumber"
                placeholder="+62812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <Button onClick={handleConnect} className="w-full">
              <Building2 className="mr-2 h-4 w-4" />
              Hubungkan BSP
            </Button>
          </CardContent>
        </Card>

        {/* BSP Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Tentang WhatsApp Business API
            </CardTitle>
            <CardDescription>
              Perbedaan dengan Cloud API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="font-medium">On-Premise Option</p>
                  <p className="text-muted-foreground">Bisa di-deploy di server sendiri</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="font-medium">SLA Guarantee</p>
                  <p className="text-muted-foreground">Jaminan uptime dari BSP</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="font-medium">Dedicated Support</p>
                  <p className="text-muted-foreground">Support langsung dari provider</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="font-medium">Custom Pricing</p>
                  <p className="text-muted-foreground">Harga negosiasi berdasarkan volume</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href="https://www.whatsapp.com/business/api" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Pelajari Lebih Lanjut
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Card */}
      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Business API vs Cloud API</CardTitle>
          <CardDescription>
            Pilih yang sesuai dengan kebutuhan bisnis Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left font-medium">Fitur</th>
                  <th className="py-3 text-center font-medium">Business API (BSP)</th>
                  <th className="py-3 text-center font-medium">Cloud API</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3">Hosting</td>
                  <td className="py-3 text-center">On-Premise / BSP</td>
                  <td className="py-3 text-center">Meta Cloud</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">Setup</td>
                  <td className="py-3 text-center">Kompleks</td>
                  <td className="py-3 text-center">Mudah</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">Biaya</td>
                  <td className="py-3 text-center">Per message + hosting</td>
                  <td className="py-3 text-center">Per conversation</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">SLA</td>
                  <td className="py-3 text-center">Tersedia</td>
                  <td className="py-3 text-center">Best Effort</td>
                </tr>
                <tr>
                  <td className="py-3">Data Control</td>
                  <td className="py-3 text-center">Penuh</td>
                  <td className="py-3 text-center">Terbatas</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
