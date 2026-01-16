import { EventEmitter } from "events";
import { Page } from "puppeteer";
import { waPuppeteerManager } from "./puppeteer-manager";

// Types
export interface WAContact {
  id: string;
  name: string;
  pushName?: string;
  phoneNumber: string;
  profilePic?: string;
  isGroup: boolean;
  isMyContact: boolean;
}

export interface WAChat {
  id: string;
  name: string;
  phoneNumber?: string;
  profilePic?: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
}

export interface WAMessage {
  id: string;
  chatId: string;
  from: string;
  fromName?: string;
  to: string;
  body: string;
  timestamp: Date;
  isFromMe: boolean;
  isForwarded: boolean;
  hasMedia: boolean;
  mediaType?: "image" | "video" | "audio" | "document" | "sticker";
  mediaUrl?: string;
  quotedMessage?: {
    id: string;
    body: string;
    from: string;
  };
  status: "pending" | "sent" | "delivered" | "read" | "failed";
}

export interface MessageQueue {
  sessionId: string;
  chatId: string;
  message: string;
  mediaUrl?: string;
  quotedMessageId?: string;
  status: "queued" | "processing" | "sent" | "failed";
  createdAt: Date;
  error?: string;
}

interface ChatSessionData {
  sessionId: string;
  chats: Map<string, WAChat>;
  messages: Map<string, WAMessage[]>; // chatId -> messages
  contacts: Map<string, WAContact>;
  messageQueue: MessageQueue[];
  isMonitoring: boolean;
  monitorInterval: NodeJS.Timeout | null;
  lastMessageCheck: Date;
}

/**
 * WhatsApp Chat Manager
 * Handles chat operations using Puppeteer
 */
class WhatsAppChatManager extends EventEmitter {
  private chatSessions: Map<string, ChatSessionData> = new Map();
  private processingQueue: boolean = false;

  constructor() {
    super();
    this.setMaxListeners(100);

    // Listen for session connections
    waPuppeteerManager.on("connected", ({ sessionId }) => {
      this.initializeChatSession(sessionId);
    });

    // Listen for session disconnections
    waPuppeteerManager.on("disconnected", ({ sessionId }) => {
      this.cleanupChatSession(sessionId);
    });

    // Start message queue processor
    this.startQueueProcessor();
  }

  /**
   * Initialize chat session after WhatsApp connects
   */
  private async initializeChatSession(sessionId: string): Promise<void> {
    const page = this.getPage(sessionId);
    if (!page) return;

    const chatData: ChatSessionData = {
      sessionId,
      chats: new Map(),
      messages: new Map(),
      contacts: new Map(),
      messageQueue: [],
      isMonitoring: false,
      monitorInterval: null,
      lastMessageCheck: new Date(),
    };

    this.chatSessions.set(sessionId, chatData);

    // Wait for WhatsApp to fully load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Start monitoring for new messages
    this.startMessageMonitoring(sessionId);

    // Load initial chat list
    await this.loadChatList(sessionId);

    console.log(`[Chat Manager] Session ${sessionId} initialized`);
    this.emit("chat_session_ready", { sessionId });
  }

  /**
   * Cleanup chat session
   */
  private cleanupChatSession(sessionId: string): void {
    const chatData = this.chatSessions.get(sessionId);
    if (chatData) {
      if (chatData.monitorInterval) {
        clearInterval(chatData.monitorInterval);
      }
      this.chatSessions.delete(sessionId);
    }
  }

  /**
   * Get page from puppeteer manager
   */
  private getPage(sessionId: string): Page | null {
    // Access the internal page - we need to expose this from puppeteer-manager
    const session = waPuppeteerManager.getSession(sessionId);
    if (!session || session.status !== "connected") return null;

    // This is a workaround - ideally we'd have a getPage method in puppeteer-manager
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = waPuppeteerManager as any;
    const sessionData = manager.sessions?.get(sessionId);
    return sessionData?.page || null;
  }

  /**
   * Start monitoring for new messages
   */
  private startMessageMonitoring(sessionId: string): void {
    const chatData = this.chatSessions.get(sessionId);
    if (!chatData || chatData.isMonitoring) return;

    chatData.isMonitoring = true;

    // Check for new messages every 2 seconds
    chatData.monitorInterval = setInterval(async () => {
      await this.checkForNewMessages(sessionId);
    }, 2000);
  }

  /**
   * Check for new incoming messages
   */
  private async checkForNewMessages(sessionId: string): Promise<void> {
    const page = this.getPage(sessionId);
    const chatData = this.chatSessions.get(sessionId);
    if (!page || !chatData) return;

    try {
      // Get unread chat indicators
      const unreadChats = await page.evaluate(() => {
        const unreadBadges = document.querySelectorAll('[data-testid="icon-unread-count"]');
        const unreadData: { chatId: string; count: number; name: string }[] = [];

        unreadBadges.forEach((badge) => {
          const chatRow = badge.closest('[data-testid="cell-frame-container"]');
          if (chatRow) {
            const nameEl = chatRow.querySelector('[data-testid="cell-frame-title"] span');
            const countText = badge.textContent || "0";
            const count = parseInt(countText, 10) || 1;

            // Try to extract chat ID from various attributes
            const dataId = chatRow.getAttribute("data-id") || "";
            unreadData.push({
              chatId: dataId,
              count,
              name: nameEl?.textContent || "Unknown",
            });
          }
        });

        return unreadData;
      });

      // Emit events for unread chats
      for (const unread of unreadChats) {
        const existing = chatData.chats.get(unread.chatId);
        if (!existing || existing.unreadCount !== unread.count) {
          this.emit("unread_update", {
            sessionId,
            chatId: unread.chatId,
            name: unread.name,
            count: unread.count,
          });
        }
      }

    } catch (error) {
      // Ignore monitoring errors
      console.error(`[Chat Manager] Message check error:`, error);
    }
  }

  /**
   * Load chat list from WhatsApp Web
   */
  async loadChatList(sessionId: string): Promise<WAChat[]> {
    const page = this.getPage(sessionId);
    const chatData = this.chatSessions.get(sessionId);
    if (!page || !chatData) return [];

    try {
      // Wait for chat list to load
      await page.waitForSelector('[data-testid="chat-list"]', { timeout: 10000 });

      // Extract chat list
      const chats = await page.evaluate(() => {
        const chatList: {
          id: string;
          name: string;
          lastMessage: string;
          lastMessageTime: string;
          unreadCount: number;
          isGroup: boolean;
          profilePic: string;
        }[] = [];

        const chatCells = document.querySelectorAll('[data-testid="cell-frame-container"]');

        chatCells.forEach((cell, index) => {
          if (index >= 50) return; // Limit to 50 chats

          const nameEl = cell.querySelector('[data-testid="cell-frame-title"] span');
          const lastMsgEl = cell.querySelector('[data-testid="last-msg-status"]')?.nextElementSibling;
          const timeEl = cell.querySelector('[data-testid="cell-frame-secondary"]');
          const unreadEl = cell.querySelector('[data-testid="icon-unread-count"]');
          const imgEl = cell.querySelector('img[src*="pps.whatsapp.net"]');
          const groupIcon = cell.querySelector('[data-testid="default-group"]');

          const name = nameEl?.textContent || "Unknown";
          const lastMessage = lastMsgEl?.textContent || "";
          const lastMessageTime = timeEl?.textContent || "";
          const unreadCount = parseInt(unreadEl?.textContent || "0", 10);
          const isGroup = !!groupIcon;
          const profilePic = imgEl?.getAttribute("src") || "";

          // Generate a unique ID based on position and name
          const id = `chat_${index}_${name.replace(/\s+/g, "_").toLowerCase()}`;

          chatList.push({
            id,
            name,
            lastMessage,
            lastMessageTime,
            unreadCount,
            isGroup,
            profilePic,
          });
        });

        return chatList;
      });

      // Update chat data
      for (const chat of chats) {
        chatData.chats.set(chat.id, {
          id: chat.id,
          name: chat.name,
          profilePic: chat.profilePic,
          isGroup: chat.isGroup,
          lastMessage: chat.lastMessage,
          unreadCount: chat.unreadCount,
          isArchived: false,
          isPinned: false,
          isMuted: false,
        });
      }

      this.emit("chats_loaded", { sessionId, chats });
      return Array.from(chatData.chats.values());

    } catch (error) {
      console.error(`[Chat Manager] Error loading chat list:`, error);
      return [];
    }
  }

  /**
   * Open a specific chat
   */
  async openChat(sessionId: string, chatName: string): Promise<boolean> {
    const page = this.getPage(sessionId);
    if (!page) return false;

    try {
      // Use search to find the chat
      const searchBox = await page.$('[data-testid="chat-list-search"]');
      if (!searchBox) {
        // Click on search button first
        const searchBtn = await page.$('[data-testid="chat-list-search-container"]');
        if (searchBtn) await searchBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Type the chat name
      const searchInput = await page.$('[data-testid="chat-list-search"]');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 }); // Select all
        await searchInput.type(chatName, { delay: 50 });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Click on the first search result
        const firstResult = await page.$('[data-testid="cell-frame-container"]');
        if (firstResult) {
          await firstResult.click();
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          // Clear search
          const clearBtn = await page.$('[data-testid="x-alt"]');
          if (clearBtn) await clearBtn.click();
          
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`[Chat Manager] Error opening chat:`, error);
      return false;
    }
  }

  /**
   * Get messages from current open chat
   */
  async getMessages(sessionId: string, limit: number = 50): Promise<WAMessage[]> {
    const page = this.getPage(sessionId);
    if (!page) return [];

    try {
      // Wait for messages container
      await page.waitForSelector('[data-testid="conversation-panel-messages"]', { timeout: 5000 });

      // Extract messages
      const messages = await page.evaluate((messageLimit) => {
        const messageList: {
          id: string;
          body: string;
          isFromMe: boolean;
          timestamp: string;
          fromName: string;
          hasMedia: boolean;
        }[] = [];

        const msgContainer = document.querySelector('[data-testid="conversation-panel-messages"]');
        if (!msgContainer) return messageList;

        const msgRows = msgContainer.querySelectorAll('[data-testid="msg-container"]');

        msgRows.forEach((row, index) => {
          if (index >= messageLimit) return;

          const isFromMe = row.classList.contains("message-out") || 
                          !!row.querySelector('[data-testid="msg-dblcheck"]');
          const bodyEl = row.querySelector('[data-testid="msg-text"]') || 
                        row.querySelector('.selectable-text');
          const timeEl = row.querySelector('[data-testid="msg-meta"] span');
          const senderEl = row.querySelector('[data-testid="msg-author"]');
          const mediaEl = row.querySelector('[data-testid="image-thumb"]') || 
                         row.querySelector('[data-testid="video-thumb"]');

          const body = bodyEl?.textContent || "";
          const timestamp = timeEl?.textContent || "";
          const fromName = senderEl?.textContent || (isFromMe ? "Me" : "");
          const hasMedia = !!mediaEl;

          messageList.push({
            id: `msg_${index}_${Date.now()}`,
            body,
            isFromMe,
            timestamp,
            fromName,
            hasMedia,
          });
        });

        return messageList.reverse(); // Oldest first
      }, limit);

      return messages.map((msg) => ({
        ...msg,
        chatId: "",
        from: msg.isFromMe ? "me" : "other",
        to: msg.isFromMe ? "other" : "me",
        timestamp: new Date(),
        isForwarded: false,
        status: "read" as const,
      }));

    } catch (error) {
      console.error(`[Chat Manager] Error getting messages:`, error);
      return [];
    }
  }

  /**
   * Send a message to the current open chat
   */
  async sendMessage(
    sessionId: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    const page = this.getPage(sessionId);
    if (!page) {
      return { success: false, error: "Session not found" };
    }

    try {
      // Find message input
      const inputSelector = '[data-testid="conversation-compose-box-input"]';
      await page.waitForSelector(inputSelector, { timeout: 5000 });

      // Type the message
      await page.click(inputSelector);
      await page.type(inputSelector, message, { delay: 30 });

      // Click send button
      const sendBtn = await page.$('[data-testid="send"]');
      if (sendBtn) {
        await sendBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 500));

        this.emit("message_sent", { sessionId, message });
        return { success: true };
      }

      return { success: false, error: "Send button not found" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send message to a specific phone number
   */
  async sendMessageToNumber(
    sessionId: string,
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    const page = this.getPage(sessionId);
    if (!page) {
      return { success: false, error: "Session not found" };
    }

    try {
      // Format phone number
      const phone = phoneNumber.replace(/\D/g, "");

      // Navigate to chat with phone number
      await page.goto(
        `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`,
        { waitUntil: "networkidle2", timeout: 30000 }
      );

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check for invalid number alert
      const invalidAlert = await page.$('[data-testid="popup-confirm-editable-input"]');
      if (invalidAlert) {
        return { success: false, error: "Invalid phone number" };
      }

      // Click send button
      const sendBtn = await page.waitForSelector('[data-testid="send"]', { timeout: 10000 });
      if (sendBtn) {
        await sendBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        this.emit("message_sent", { sessionId, phoneNumber: phone, message });
        return { success: true };
      }

      return { success: false, error: "Send button not found" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add message to queue
   */
  queueMessage(
    sessionId: string,
    chatId: string,
    message: string,
    mediaUrl?: string
  ): void {
    const queueItem: MessageQueue = {
      sessionId,
      chatId,
      message,
      mediaUrl,
      status: "queued",
      createdAt: new Date(),
    };

    const chatData = this.chatSessions.get(sessionId);
    if (chatData) {
      chatData.messageQueue.push(queueItem);
      this.emit("message_queued", queueItem);
    }
  }

  /**
   * Process message queue
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.processingQueue) return;
      this.processingQueue = true;

      try {
        for (const [sessionId, chatData] of this.chatSessions) {
          const pendingMessages = chatData.messageQueue.filter(
            (m) => m.status === "queued"
          );

          for (const msg of pendingMessages) {
            msg.status = "processing";
            
            const result = await this.sendMessage(sessionId, msg.message);
            
            if (result.success) {
              msg.status = "sent";
              this.emit("queue_message_sent", msg);
            } else {
              msg.status = "failed";
              msg.error = result.error;
              this.emit("queue_message_failed", msg);
            }

            // Small delay between messages
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          // Remove sent messages from queue
          chatData.messageQueue = chatData.messageQueue.filter(
            (m) => m.status !== "sent"
          );
        }
      } finally {
        this.processingQueue = false;
      }
    }, 5000); // Process queue every 5 seconds
  }

  /**
   * Get chats for a session
   */
  getChats(sessionId: string): WAChat[] {
    const chatData = this.chatSessions.get(sessionId);
    if (!chatData) return [];
    return Array.from(chatData.chats.values());
  }

  /**
   * Check if session has chat capability
   */
  isReady(sessionId: string): boolean {
    return this.chatSessions.has(sessionId);
  }

  /**
   * Get session message queue status
   */
  getQueueStatus(sessionId: string): MessageQueue[] {
    const chatData = this.chatSessions.get(sessionId);
    return chatData?.messageQueue || [];
  }
}

// Singleton instance
export const waChatManager = new WhatsAppChatManager();
