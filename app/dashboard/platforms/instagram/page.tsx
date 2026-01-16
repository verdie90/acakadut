"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, ExternalLink, CheckCircle2, AlertCircle, Heart, Send, Users } from "lucide-react";
import { useState } from "react";

export default function InstagramPage() {
  const [isConnected] = useState(false);

  const handleConnectInstagram = () => {
    // TODO: Implement Instagram OAuth flow
    console.log("Connecting to Instagram...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Instagram Messaging</h2>
          <p className="text-muted-foreground">
            Hubungkan akun Instagram bisnis untuk mengelola pesan dan komentar
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

      {/* Connect Card */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600 p-4 mb-4">
            <Instagram className="h-12 w-12 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Hubungkan Akun Instagram</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Hubungkan akun Instagram Professional (Business atau Creator) untuk mengelola
            Direct Messages dan Comment secara terpusat
          </p>
          <Button 
            onClick={handleConnectInstagram}
            className="bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Instagram className="mr-2 h-4 w-4" />
            Login dengan Instagram
          </Button>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-purple-500" />
              Direct Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kelola semua pesan langsung dari pelanggan dalam satu dashboard. 
              Balas pesan dengan cepat dan efisien.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-pink-500" />
              Comment Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pantau dan balas komentar pada postingan Anda. Tingkatkan engagement 
              dengan respons yang cepat.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-blue-500" />
              Story Replies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kelola balasan story dari followers. Semua interaksi tersimpan 
              dan mudah diakses.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requirements Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Persyaratan Akun
          </CardTitle>
          <CardDescription>
            Pastikan akun Instagram Anda memenuhi syarat berikut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">✅ Yang Diperlukan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  Akun Instagram Professional (Business atau Creator)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  Terhubung dengan Facebook Page
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  Akses admin ke Facebook Page terkait
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  Messaging enabled di Instagram settings
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">📋 Langkah Persiapan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1. Konversi akun ke Professional Account</li>
                <li>2. Hubungkan dengan Facebook Business Page</li>
                <li>3. Aktifkan message controls di Settings</li>
                <li>4. Login dan authorize aplikasi</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <Button variant="outline" asChild>
              <a 
                href="https://help.instagram.com/502981923235522" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Panduan Setup Akun Professional
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card>
        <CardHeader>
          <CardTitle>Instagram Messaging API</CardTitle>
          <CardDescription>
            Menggunakan Instagram Graph API untuk messaging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">📩 Inbox Management</h4>
              <p className="text-sm text-muted-foreground">
                Terima dan balas DM secara otomatis atau manual melalui dashboard
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">🤖 Automation</h4>
              <p className="text-sm text-muted-foreground">
                Set up auto-reply untuk FAQ dan keyword tertentu
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold mb-2">📊 Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Pantau metrics engagement dan response time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
