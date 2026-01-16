import puppeteer, { Browser, Page } from "puppeteer";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs";

// Types
export interface WASession {
  id: string;
  userId: string;
  deviceName?: string; // Admin-given name
  status: "initializing" | "qr_ready" | "authenticated" | "connected" | "disconnected" | "error";
  qrCode?: string;
  phoneNumber?: string;
  pushName?: string; // WhatsApp display name
  profilePic?: string;
  platform?: string; // Device platform (Android/iOS/etc)
  error?: string;
  lastQrUpdate?: Date;
  lastSyncAt?: Date; // Last activity/sync timestamp
  connectedAt?: Date;
  createdAt: Date;
}

interface SessionData {
  browser: Browser | null;
  page: Page | null;
  session: WASession;
  qrInterval: NodeJS.Timeout | null;
  authInterval: NodeJS.Timeout | null;
  syncInterval: NodeJS.Timeout | null; // For periodic sync updates
  keepAlive: boolean;
}

// Session storage directory
const SESSION_DIR = path.join(process.cwd(), ".wa_sessions");

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Find Chrome executable
function findChromePath(): string | undefined {
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  for (const chromePath of possiblePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  return undefined;
}

/**
 * WhatsApp Puppeteer Manager
 * Manages WhatsApp Web sessions using Puppeteer directly
 */
class WhatsAppPuppeteerManager extends EventEmitter {
  private sessions: Map<string, SessionData> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Create a new WhatsApp session
   */
  async createSession(sessionId: string, userId: string, deviceName?: string): Promise<WASession> {
    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId)!;
      return existing.session;
    }

    const session: WASession = {
      id: sessionId,
      userId,
      deviceName: deviceName || `Device ${sessionId.slice(-6)}`,
      status: "initializing",
      createdAt: new Date(),
    };

    const sessionData: SessionData = {
      browser: null,
      page: null,
      session,
      qrInterval: null,
      authInterval: null,
      syncInterval: null,
      keepAlive: true, // Keep browser open after connection
    };

    this.sessions.set(sessionId, sessionData);
    this.emit("status", { sessionId, status: "initializing" });

    try {
      // Launch browser
      const executablePath = findChromePath();
      const userDataDir = path.join(SESSION_DIR, `session-${sessionId}`);

      const browser = await puppeteer.launch({
        headless: true,
        executablePath,
        userDataDir,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--window-size=1280,800",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
        ],
        defaultViewport: {
          width: 1280,
          height: 800,
        },
      });

      sessionData.browser = browser;

      // Create page
      const page = await browser.newPage();
      sessionData.page = page;

      // Set user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Navigate to WhatsApp Web
      await page.goto("https://web.whatsapp.com", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Start QR code monitoring
      this.startQRMonitoring(sessionId);

      // Monitor for authentication
      this.monitorAuthentication(sessionId);

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      session.status = "error";
      session.error = errorMessage;
      this.emit("error", { sessionId, error: errorMessage });
      throw error;
    }
  }

  /**
   * Start monitoring for QR code changes
   */
  private startQRMonitoring(sessionId: string) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !sessionData.page) return;

    const { page, session } = sessionData;

    // Check for QR code every 2 seconds
    sessionData.qrInterval = setInterval(async () => {
      try {
        // Check if still on QR page
        const qrCanvas = await page.$('canvas[aria-label="Scan this QR code to link a device!"]');
        
        if (!qrCanvas) {
          // Try alternative selector
          const altCanvas = await page.$("canvas");
          if (!altCanvas) {
            // No QR canvas found, might be authenticated
            return;
          }
        }

        const canvas = qrCanvas || await page.$("canvas");
        if (!canvas) return;

        // Get QR code as base64
        const qrBase64 = await canvas.screenshot({ encoding: "base64" });
        const qrDataUrl = `data:image/png;base64,${qrBase64}`;

        // Only emit if QR changed
        if (session.qrCode !== qrDataUrl) {
          session.qrCode = qrDataUrl;
          session.status = "qr_ready";
          session.lastQrUpdate = new Date();
          this.emit("qr", { sessionId, qr: qrDataUrl });
          this.emit("status", { sessionId, status: "qr_ready" });
        }
      } catch {
        // Ignore errors during QR monitoring (page might have navigated)
      }
    }, 2000);
  }

  /**
   * Monitor for successful authentication
   */
  private monitorAuthentication(sessionId: string) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !sessionData.page) return;

    const { page, session } = sessionData;

    // Check for main app loaded (authenticated)
    const checkAuth = async (): Promise<boolean> => {
      try {
        // Multiple selectors to detect successful authentication
        const authSelectors = [
          '[data-testid="chat-list"]',           // Chat list panel
          '[data-testid="side"]',                // Side panel
          '[data-testid="default-user"]',        // Default user icon
          '[data-testid="menu-bar-avatar"]',     // Profile avatar in menu
          'div[data-tab="3"]',                   // Chat tab
          '#pane-side',                          // Side pane (legacy)
        ];

        // Check if any auth selector exists
        let isAuthenticated = false;
        for (const selector of authSelectors) {
          const element = await page.$(selector);
          if (element) {
            isAuthenticated = true;
            break;
          }
        }

        if (!isAuthenticated) {
          return false;
        }

        // Stop QR monitoring
        if (sessionData.qrInterval) {
          clearInterval(sessionData.qrInterval);
          sessionData.qrInterval = null;
        }

        // Update session status
        session.status = "connected";
        session.qrCode = undefined;
        session.connectedAt = new Date();

        // Extract profile information
        await this.extractProfileInfo(sessionId);

        // Emit connected event with session details
        this.emit("connected", { 
          sessionId, 
          session: {
            ...session,
            phoneNumber: session.phoneNumber,
            pushName: session.pushName,
          }
        });
        this.emit("status", { sessionId, status: "connected" });

        console.log(`[WA Session ${sessionId}] Connected successfully!`);
        console.log(`[WA Session ${sessionId}] Phone: ${session.phoneNumber || "Unknown"}`);
        console.log(`[WA Session ${sessionId}] Name: ${session.pushName || session.deviceName || "Unknown"}`);

        return true;
      } catch (error) {
        console.error(`[WA Session ${sessionId}] Auth check error:`, error);
        return false;
      }
    };

    // Check authentication status periodically
    sessionData.authInterval = setInterval(async () => {
      const isAuth = await checkAuth();
      if (isAuth) {
        if (sessionData.authInterval) {
          clearInterval(sessionData.authInterval);
          sessionData.authInterval = null;
        }

        // If keepAlive is false, close the browser after successful connection
        if (!sessionData.keepAlive) {
          console.log(`[WA Session ${sessionId}] Closing browser (keepAlive=false)`);
          await this.closeBrowser(sessionId);
        } else {
          // Start connection health monitoring and sync interval
          this.startConnectionMonitor(sessionId);
          this.startSyncInterval(sessionId);
        }
      }
    }, 2000); // Check every 2 seconds for faster detection

    // Timeout after 5 minutes
    setTimeout(() => {
      if (sessionData.authInterval) {
        clearInterval(sessionData.authInterval);
        sessionData.authInterval = null;
        
        if (session.status !== "connected") {
          session.status = "error";
          session.error = "Authentication timeout";
          this.emit("error", { sessionId, error: "Authentication timeout - QR code expired" });
          this.emit("status", { sessionId, status: "error" });
        }
      }
    }, 300000);
  }

  /**
   * Extract profile information after successful authentication
   */
  private async extractProfileInfo(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !sessionData.page) return;

    const { page, session } = sessionData;

    try {
      // Wait a bit for the page to fully load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update last sync timestamp
      session.lastSyncAt = new Date();

      // Method 1: Try to get info from localStorage/IndexedDB
      const storedInfo = await page.evaluate(() => {
        try {
          // Get phone number from localStorage
          let phoneNumber = null;
          const waNumber = localStorage.getItem("last-wid-md");
          if (waNumber) {
            const parsed = JSON.parse(waNumber);
            if (typeof parsed === "string") {
              phoneNumber = parsed.split("@")[0];
            }
          }

          // Try to get push name from localStorage
          let pushName = null;
          const pushNameData = localStorage.getItem("pushname");
          if (pushNameData) {
            try {
              pushName = JSON.parse(pushNameData);
            } catch {
              pushName = pushNameData;
            }
          }

          // Try to detect platform
          let platform = null;
          const ua = navigator.userAgent;
          if (ua.includes("WhatsApp")) {
            platform = "WhatsApp Web";
          }

          return { phoneNumber, pushName, platform };
        } catch {
          return { phoneNumber: null, pushName: null, platform: null };
        }
      });

      if (storedInfo.phoneNumber) {
        session.phoneNumber = storedInfo.phoneNumber;
      }
      if (storedInfo.pushName) {
        session.pushName = storedInfo.pushName;
      }
      if (storedInfo.platform) {
        session.platform = storedInfo.platform;
      }

      // Method 2: Try clicking profile button to get detailed info
      try {
        const avatarButton = await page.$('[data-testid="menu-bar-avatar"]');
        if (avatarButton) {
          await avatarButton.click();
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Get name from profile drawer
          const nameElement = await page.$('[data-testid="drawer-middle"] span[dir="auto"]');
          if (nameElement) {
            const name = await nameElement.evaluate((el) => el.textContent || "");
            if (name && name.length > 0) {
              session.pushName = name;
            }
          }

          // Get phone from profile drawer - try multiple selectors
          const phoneSelectors = [
            '[data-testid="drawer-middle"] span[title*="+"]',
            '[data-testid="drawer-middle"] span[title*="62"]',
            '[data-testid="drawer-subtitle"] span',
          ];

          for (const selector of phoneSelectors) {
            const phoneElement = await page.$(selector);
            if (phoneElement) {
              const phone = await phoneElement.evaluate((el) => {
                return el.getAttribute("title") || el.textContent || "";
              });
              if (phone && /\d{10,}/.test(phone.replace(/\D/g, ""))) {
                session.phoneNumber = phone.replace(/\D/g, "");
                break;
              }
            }
          }

          // Try to get profile picture URL
          try {
            const profilePicElement = await page.$('[data-testid="drawer-middle"] img[src*="pps.whatsapp.net"]');
            if (profilePicElement) {
              const picUrl = await profilePicElement.evaluate((el) => el.getAttribute("src") || "");
              if (picUrl) {
                session.profilePic = picUrl;
              }
            }
          } catch {
            // Ignore profile pic errors
          }

          // Close the drawer
          const closeButton = await page.$('[data-testid="btn-closer-drawer"]');
          if (closeButton) {
            await closeButton.click();
          } else {
            await page.keyboard.press("Escape");
          }
          
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch {
        // Profile extraction failed, not critical
      }

      // Method 3: Get phone number from URL if redirected
      const currentUrl = page.url();
      const phoneMatch = currentUrl.match(/phone=(\d+)/);
      if (phoneMatch && !session.phoneNumber) {
        session.phoneNumber = phoneMatch[1];
      }

      // Emit sync event with updated session info
      this.emit("sync", { 
        sessionId, 
        session: {
          id: session.id,
          deviceName: session.deviceName,
          phoneNumber: session.phoneNumber,
          pushName: session.pushName,
          profilePic: session.profilePic,
          platform: session.platform,
          lastSyncAt: session.lastSyncAt,
          connectedAt: session.connectedAt,
          status: session.status,
        }
      });

      console.log(`[WA Session ${sessionId}] Profile extracted:`, {
        phoneNumber: session.phoneNumber,
        pushName: session.pushName,
        platform: session.platform,
      });

    } catch (error) {
      console.error(`[WA Session ${sessionId}] Error extracting profile:`, error);
    }
  }

  /**
   * Start periodic sync to update session info
   */
  private startSyncInterval(sessionId: string) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) return;

    // Sync every 60 seconds
    sessionData.syncInterval = setInterval(async () => {
      const session = this.sessions.get(sessionId);
      if (!session || session.session.status !== "connected") {
        if (sessionData.syncInterval) {
          clearInterval(sessionData.syncInterval);
          sessionData.syncInterval = null;
        }
        return;
      }

      // Update last sync time
      session.session.lastSyncAt = new Date();
      
      this.emit("sync", { 
        sessionId, 
        session: {
          id: session.session.id,
          deviceName: session.session.deviceName,
          phoneNumber: session.session.phoneNumber,
          pushName: session.session.pushName,
          lastSyncAt: session.session.lastSyncAt,
          status: session.session.status,
        }
      });
    }, 60000);
  }

  /**
   * Start monitoring connection health
   */
  private startConnectionMonitor(sessionId: string) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !sessionData.page) return;

    const { page, session } = sessionData;

    // Check connection health every 30 seconds
    const healthInterval = setInterval(async () => {
      try {
        // Check if browser is still connected
        if (!sessionData.browser?.isConnected()) {
          session.status = "disconnected";
          this.emit("disconnected", { sessionId });
          this.emit("status", { sessionId, status: "disconnected" });
          clearInterval(healthInterval);
          return;
        }

        // Check if still on WhatsApp Web
        const url = page.url();
        if (!url.includes("web.whatsapp.com")) {
          session.status = "disconnected";
          this.emit("disconnected", { sessionId });
          this.emit("status", { sessionId, status: "disconnected" });
          clearInterval(healthInterval);
          return;
        }

        // Check for logout/disconnect indicators
        const qrCanvas = await page.$('canvas[aria-label="Scan this QR code to link a device!"]');
        if (qrCanvas) {
          // QR code appeared again = disconnected
          session.status = "disconnected";
          this.emit("disconnected", { sessionId, reason: "Session logged out" });
          this.emit("status", { sessionId, status: "disconnected" });
          clearInterval(healthInterval);
          return;
        }

      } catch {
        // Connection check failed
        session.status = "disconnected";
        this.emit("disconnected", { sessionId });
        this.emit("status", { sessionId, status: "disconnected" });
        clearInterval(healthInterval);
      }
    }, 30000);
  }

  /**
   * Close browser without deleting session data
   */
  private async closeBrowser(sessionId: string) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !sessionData.browser) return;

    try {
      await sessionData.browser.close();
      sessionData.browser = null;
      sessionData.page = null;
    } catch {
      // Ignore close errors
    }
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): WASession | null {
    const sessionData = this.sessions.get(sessionId);
    return sessionData?.session || null;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): WASession[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.session.userId === userId)
      .map((s) => s.session);
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) return;

    // Clear all intervals
    if (sessionData.qrInterval) {
      clearInterval(sessionData.qrInterval);
      sessionData.qrInterval = null;
    }
    if (sessionData.authInterval) {
      clearInterval(sessionData.authInterval);
      sessionData.authInterval = null;
    }
    if (sessionData.syncInterval) {
      clearInterval(sessionData.syncInterval);
      sessionData.syncInterval = null;
    }

    // Close browser
    if (sessionData.browser) {
      try {
        await sessionData.browser.close();
      } catch {
        // Ignore close errors
      }
    }

    // Remove session data
    this.sessions.delete(sessionId);

    // Optionally remove session directory
    const sessionPath = path.join(SESSION_DIR, `session-${sessionId}`);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    this.emit("disconnected", { sessionId });
  }

  /**
   * Send a message
   */
  async sendMessage(
    sessionId: string,
    to: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData || !sessionData.page) {
      return { success: false, error: "Session not found" };
    }

    if (sessionData.session.status !== "connected") {
      return { success: false, error: "Session not connected" };
    }

    try {
      const { page } = sessionData;

      // Format phone number
      const phone = to.replace(/\D/g, "");

      // Navigate to chat
      await page.goto(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, {
        waitUntil: "networkidle2",
      });

      // Wait for send button and click
      await page.waitForSelector('[data-testid="send"]', { timeout: 30000 });
      await page.click('[data-testid="send"]');

      // Wait for message to be sent
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Subscribe to QR updates for a session
   */
  subscribeToQR(sessionId: string, callback: (qr: string) => void): () => void {
    const handler = (data: { sessionId: string; qr: string }) => {
      if (data.sessionId === sessionId) {
        callback(data.qr);
      }
    };
    this.on("qr", handler);
    return () => this.off("qr", handler);
  }

  /**
   * Subscribe to status updates for a session
   */
  subscribeToStatus(sessionId: string, callback: (status: string) => void): () => void {
    const handler = (data: { sessionId: string; status: string }) => {
      if (data.sessionId === sessionId) {
        callback(data.status);
      }
    };
    this.on("status", handler);
    return () => this.off("status", handler);
  }
}

// Singleton instance
export const waPuppeteerManager = new WhatsAppPuppeteerManager();
