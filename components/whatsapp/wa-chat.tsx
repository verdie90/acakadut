"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useWAChat } from "@/hooks/use-wa-chat";
import { cn } from "@/lib/utils";
import {
  Send,
  RefreshCw,
  Search,
  MessageCircle,
  Users,
  User,
  Loader2,
  Phone,
  ArrowLeft,
  MoreVertical,
  Image as ImageIcon,
  Paperclip,
  Smile,
  Mic,
  CheckCheck,
  Menu,
} from "lucide-react";

// Types
interface WAChat {
  id: string;
  name: string;
  profilePic?: string;
  isGroup: boolean;
  lastMessage?: string;
  unreadCount: number;
}

interface WAMessage {
  id: string;
  body: string;
  isFromMe: boolean;
  timestamp: string;
  fromName: string;
  hasMedia: boolean;
}

// Chat List Item Component
function ChatListItem({
  chat,
  isActive,
  onClick,
}: {
  chat: WAChat;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
        isActive && "bg-muted"
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={chat.profilePic} />
        <AvatarFallback className={chat.isGroup ? "bg-blue-500" : "bg-gray-500"}>
          {chat.isGroup ? (
            <Users className="h-5 w-5 text-white" />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm truncate">{chat.name}</p>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {chat.lastMessage || "Tidak ada pesan"}
          </p>
          {chat.unreadCount > 0 && (
            <Badge className="h-5 min-w-5 text-xs bg-green-500 shrink-0">
              {chat.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: WAMessage }) {
  return (
    <div className={cn("flex", message.isFromMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 shadow-sm",
          message.isFromMe
            ? "bg-green-500 text-white rounded-br-none"
            : "bg-white dark:bg-gray-800 rounded-bl-none"
        )}
      >
        {!message.isFromMe && message.fromName && message.fromName !== "Me" && (
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            {message.fromName}
          </p>
        )}
        {message.hasMedia && (
          <div className="flex items-center gap-1 mb-1 opacity-70">
            <ImageIcon className="h-3 w-3" />
            <span className="text-xs">Media</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.body}</p>
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1",
            message.isFromMe ? "text-white/70" : "text-muted-foreground"
          )}
        >
          <span className="text-[10px]">{message.timestamp}</span>
          {message.isFromMe && <CheckCheck className="h-3 w-3" />}
        </div>
      </div>
    </div>
  );
}

// Chat List Component
function ChatList({
  chats,
  currentChat,
  searchQuery,
  onSearchChange,
  totalUnread,
  isLoading,
  onChatClick,
  onNewChatClick,
}: {
  chats: WAChat[];
  currentChat: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalUnread: number;
  isLoading: boolean;
  onChatClick: (chatName: string) => void;
  onNewChatClick: () => void;
}) {
  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari chat..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Chat Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 px-3 pt-2">
          <TabsTrigger value="all" className="text-xs">
            Semua
            {totalUnread > 0 && (
              <Badge className="ml-1 h-5 min-w-5 text-xs bg-green-500">{totalUnread}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">
            Belum dibaca
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs">
            Grup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 mt-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {isLoading && chats.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-2" />
                <p className="text-sm">Tidak ada chat</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredChats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChat === chat.name}
                    onClick={() => onChatClick(chat.name)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="unread" className="flex-1 mt-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {filteredChats.filter((c) => c.unreadCount > 0).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCheck className="h-8 w-8 mb-2" />
                <p className="text-sm">Semua sudah dibaca</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredChats
                  .filter((c) => c.unreadCount > 0)
                  .map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChat === chat.name}
                      onClick={() => onChatClick(chat.name)}
                    />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="groups" className="flex-1 mt-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {filteredChats.filter((c) => c.isGroup).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm">Tidak ada grup</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredChats
                  .filter((c) => c.isGroup)
                  .map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      isActive={currentChat === chat.name}
                      onClick={() => onChatClick(chat.name)}
                    />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* New Chat Button */}
      <div className="p-3 border-t">
        <Button className="w-full bg-green-500 hover:bg-green-600" onClick={onNewChatClick}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat Baru
        </Button>
      </div>
    </div>
  );
}

// Main Chat Component
interface WhatsAppChatProps {
  sessionId: string;
  deviceName: string;
  phoneNumber?: string;
  onBack?: () => void;
}

export function WhatsAppChat({ sessionId, deviceName, phoneNumber, onBack }: WhatsAppChatProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isReady,
    chats,
    messages,
    currentChat,
    isLoading,
    isSending,
    error,
    loadChats,
    openChat,
    sendMessage,
    refreshMessages,
  } = useWAChat(sessionId);

  // Load chats on mount
  useEffect(() => {
    if (sessionId) {
      loadChats();
    }
  }, [sessionId, loadChats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;

    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput("");
    }
  }, [messageInput, sendMessage]);

  // Handle send new chat message
  const handleSendNewChatMessage = useCallback(async () => {
    if (!newChatPhone.trim() || !newChatMessage.trim()) return;

    const phone = newChatPhone.replace(/\D/g, "");
    const success = await sendMessage(newChatMessage, phone);
    if (success) {
      setNewChatPhone("");
      setNewChatMessage("");
      setShowNewChat(false);
      loadChats();
    }
  }, [newChatPhone, newChatMessage, sendMessage, loadChats]);

  // Handle chat click
  const handleChatClick = useCallback(
    (chatName: string) => {
      openChat(chatName);
      setIsMobileMenuOpen(false);
    },
    [openChat]
  );

  // Get total unread count
  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <Card className="h-[calc(100vh-200px)] min-h-125 flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">{deviceName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {phoneNumber ? `+${phoneNumber}` : "WhatsApp Web"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isReady ? "border-green-500 text-green-600" : "border-yellow-500 text-yellow-600"
              )}
            >
              {isReady ? "Siap" : "Memuat..."}
            </Badge>
            <Button variant="ghost" size="icon" onClick={loadChats} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            {/* Mobile menu trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Daftar Chat</SheetTitle>
                </SheetHeader>
                <ChatList
                  chats={chats}
                  currentChat={currentChat}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalUnread={totalUnread}
                  isLoading={isLoading}
                  onChatClick={handleChatClick}
                  onNewChatClick={() => setShowNewChat(true)}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex overflow-hidden">
        {/* Desktop Chat List */}
        <div className="hidden md:flex w-80 border-r flex-col">
          <ChatList
            chats={chats}
            currentChat={currentChat}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalUnread={totalUnread}
            isLoading={isLoading}
            onChatClick={handleChatClick}
            onNewChatClick={() => setShowNewChat(true)}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{currentChat.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{currentChat}</p>
                    <p className="text-xs text-muted-foreground">
                      {isLoading ? "Memuat..." : `${messages.length} pesan`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={refreshMessages}>
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mb-3" />
                      <p>Tidak ada pesan</p>
                      <p className="text-xs">Kirim pesan untuk memulai percakapan</p>
                    </div>
                  ) : (
                    messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-3 border-t bg-muted/30">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Input
                    placeholder="Ketik pesan..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                    disabled={isSending}
                  />
                  {messageInput.trim() ? (
                    <Button
                      size="icon"
                      className="shrink-0 bg-green-500 hover:bg-green-600"
                      onClick={handleSendMessage}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Mic className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No Chat Selected */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
              <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center mb-6">
                <MessageCircle className="h-24 w-24" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">WhatsApp Web</h3>
              <p className="text-sm text-center max-w-xs">
                Pilih chat dari daftar atau mulai percakapan baru untuk mengirim pesan
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* New Chat Dialog */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Chat Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor WhatsApp</label>
                <Input
                  placeholder="628123456789"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Format: kode negara + nomor (tanpa + atau spasi)
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Pesan</label>
                <Input
                  placeholder="Ketik pesan..."
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendNewChatMessage();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowNewChat(false)}>
                  Batal
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={handleSendNewChatMessage}
                  disabled={!newChatPhone.trim() || !newChatMessage.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Kirim
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </Card>
  );
}
