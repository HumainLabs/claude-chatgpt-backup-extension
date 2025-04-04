// Instead of importing the types, we'll just declare them directly
// This avoids the "exports is not defined" error

// Define the types we need without imports
// Fixing duplicate type declarations
interface BackgroundCustomBrowser {
  cookies: any;
  tabs: any;
  downloads: any;
  runtime: any;
  notifications: any;
}

interface Cookie {
  name: string;
  value: string;
}

type MessageSender = any;
type Tab = {
  url: string;
  id?: number;
};

// Type assertion for the existing browser global
// Use a file-specific variable name to avoid redeclaration issues between files
const bgBrowserAPI = (window as any).browser as BackgroundCustomBrowser;

// ===== ChatGPT Export Functionality =====
// Constants for ChatGPT
const DOMAIN_CHATGPT = "chatgpt.com";

// Simple logger that always logs errors - with unique name for background
const bgLogger = {
  error: (message: string, ...args: any[]) => {
    console.error(`[HumainLabs Backup] ${message}`, ...args);
  },
  log: (message: string, ...args: any[]) => {
    // Only log in development or testing
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.log(`[HumainLabs Backup] ${message}`, ...args);
    }
  }
};

// Session data and key for encryption
const gptSession = { data: null as any };
let KEY_TOKEN = "";

// Initialize encryption key
function initChatGPT() {
  KEY_TOKEN = generateRandomString(32);
}

// Call initialization
initChatGPT();

// Generate a random string for encryption
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  const charset = shuffleString(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  );
  return Array.from(array, (x) => charset[x % charset.length]).join("");
}

// Shuffle string helper
function shuffleString(str: string): string {
  const chars = str.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Encryption function
function encryptToken(token: string, key: string): string {
  let encrypted = "";
  for (let i = 0; i < token.length; i++) {
    let charCode = token.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  return encrypted;
}

// Decryption function
function decryptToken(token: string, key: string): string {
  let decrypted = "";
  for (let i = 0; i < token.length; i++) {
    let charCode = token.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
}

// Extract thread ID from ChatGPT URL
function getChatGPTThreadId(url: string): string | null {
  // Handle old format: chatgpt.com/c/{threadId}
  const oldFormatMatch = url.match(/chatgpt\.com\/c\/([\w-]+)/);
  if (oldFormatMatch) return oldFormatMatch[1];
  
  // Handle new format: chatgpt.com/g/{custom-id}/c/{conversationId}
  const newFormatMatch = url.match(/chatgpt\.com\/g\/[^/]+\/c\/([a-zA-Z0-9-]+)/);
  if (newFormatMatch) return newFormatMatch[1];
  
  return null;
}

// Get ChatGPT access token
async function getChatGPTAccessToken(): Promise<string> {
  if (gptSession.data == null) {
    // We'll use a generic approach that works in both browsers
    const response = await fetch(`https://${DOMAIN_CHATGPT}/api/auth/session`, {
      credentials: "include",
      headers: {
        "User-Agent": window.navigator.userAgent,
        Accept: "*/*",
        "Accept-Language": navigator.language,
        "Alt-Used": DOMAIN_CHATGPT,
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
      method: "GET",
      mode: "cors",
    });

    const data = await response.json();
    
    // Encrypt the accessToken for secure storage
    data.accessToken = encryptToken(data.accessToken, KEY_TOKEN);
    
    // Cache the session data
    gptSession.data = data;
  }
  
  // Decrypt and return the token
  return decryptToken(gptSession.data.accessToken, KEY_TOKEN);
}

// Fetch ChatGPT conversation data
async function getChatGPTConversation(threadId: string): Promise<any> {
  const token = await getChatGPTAccessToken();
  
  const response = await fetch(
    `https://${DOMAIN_CHATGPT}/backend-api/conversation/${threadId}`,
    {
      credentials: "include",
      headers: {
        "User-Agent": window.navigator.userAgent,
        Accept: "*/*",
        "Accept-Language": navigator.language,
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Alt-Used": DOMAIN_CHATGPT,
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
      method: "GET",
      mode: "cors",
    }
  );
  
  return await response.json();
}

// Format ChatGPT filename and prepare download
function prepareChatGPTDownload(threadId: string, data: any): { content: string, filename: string } {
  const jsonText = JSON.stringify(data, null, 2);
  const title = data.title || "untitled";
  const safeTitle = title.replace(/[^a-z0-9-]/gi, '_').substring(0, 50);
  
  // Get current datetime
  const now = new Date();
  const datetime = now.toISOString()
    .replace(/[:.]/g, '')
    .replace('T', '-')
    .split('Z')[0];
    
  return {
    content: jsonText,
    filename: `${safeTitle} -- ChatGPT log -- ${threadId}.json`
  };
}

// ===== Claude Conversation Functionality =====

// Interface for Claude conversation
interface ClaudeConversation {
  uuid: string;
  name: string;
  // Add other fields as needed
}

async function getCookie(): Promise<string | null> {
    try {
        const cookie = await bgBrowserAPI.cookies.get({
            url: 'https://claude.ai',
            name: 'lastActiveOrg'
        });
        return cookie ? cookie.value : null;
    } catch (error) {
        bgLogger.error('Error getting Claude.ai cookie:', error);
        return null;
    }
}

// New function to get all cookies for authentication
async function getAuthCookies(): Promise<Record<string, string>> {
    try {
        const cookies = await bgBrowserAPI.cookies.getAll({ url: 'https://claude.ai' });
        return cookies.reduce((obj: Record<string, string>, cookie: Cookie) => {
            obj[cookie.name] = cookie.value;
            return obj;
        }, {});
    } catch (error) {
        bgLogger.error('Error getting Claude.ai auth cookies:', error);
        return {};
    }
}

// Function to extract conversation ID from Claude URL
function extractConversationId(url: string): string | null {
    const match = url.match(/\/chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
}

async function fetchConversations(organizationId: string): Promise<ClaudeConversation[]> {
    const url = `https://claude.ai/api/organizations/${organizationId}/chat_conversations`;
    
    // Firefox extensions can't set Cookie headers directly, but can use credentials: 'include'
    // which will include cookies automatically
    const response = await fetch(url, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
    return await response.json();
}

async function fetchConversationDetails(organizationId: string, conversationId: string): Promise<any> {
    const response = await fetch(`https://claude.ai/api/organizations/${organizationId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }
    return await response.json();
}

async function fetchAllConversationDetails(organizationId: string, conversations: ClaudeConversation[]): Promise<any[]> {
    const detailPromises = conversations.map(conv =>
        fetchConversationDetails(organizationId, conv.uuid)
    );
    return await Promise.all(detailPromises);
}

// Format a date for the filename
function formatDateForFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timezoneOffset = -now.getTimezoneOffset() / 60;
    return `${year}-${month}-${day}T${hours}${minutes}${timezoneOffset >= 0 ? '+' : '-'}${Math.abs(timezoneOffset)}`;
}

// Download a JSON file
async function downloadJson(data: any, filename: string): Promise<void> {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        await bgBrowserAPI.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        });
        URL.revokeObjectURL(url);
        
        bgLogger.log(`Successfully created download for: ${filename}`);
    } catch (error) {
        bgLogger.error(`Error downloading JSON file ${filename}:`, error);
        throw error; // Re-throw to be handled by the caller
    }
}

// Show a notification
async function showNotification(title: string, message: string, isError: boolean = false): Promise<void> {
    try {
        await bgBrowserAPI.notifications.create({
            type: "basic",
            iconUrl: bgBrowserAPI.runtime.getURL("icons/icon48.png"),
            title: isError ? `HumainLabs Claude Backup Error` : `HumainLabs Claude Backup`,
            message: message
        });
        
        // Also log to console for easier debugging
        if (isError) {
            bgLogger.error(`${title}: ${message}`);
        } else {
            bgLogger.log(`${title}: ${message}`);
        }
    } catch (error) {
        // At minimum, log to console if notification fails
        bgLogger.error('Failed to show notification:', error);
        bgLogger.error(`${title}: ${message}`);
    }
}

// Export current chat from the active tab
async function exportCurrentChat() {
    try {
        // Get current active tab
        const tabs = await bgBrowserAPI.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0] as Tab;
        
        if (!currentTab.url || !currentTab.url.includes('claude.ai/chat')) {
            const errorMsg = "Please open a Claude.ai chat before using this feature.";
            bgLogger.error(errorMsg);
            await showNotification(
                "HumainLabs Claude Backup Error", 
                errorMsg,
                true
            );
            return;
        }
        
        // Extract conversation ID from URL
        const conversationId = extractConversationId(currentTab.url);
        if (!conversationId) {
            await showNotification(
                "HumainLabs Claude Backup Error", 
                "Could not identify the conversation ID from the current page.",
                true
            );
            return;
        }
        
        // Get organization ID from cookie
        const organizationId = await getCookie();
        if (!organizationId) {
            await showNotification(
                "HumainLabs Claude Backup Error", 
                "Required cookie not found. Please make sure you're logged into Claude.ai.",
                true
            );
            return;
        }
        
        // Fetch just this conversation's details
        const conversationDetails = await fetchConversationDetails(organizationId, conversationId);
        
        // Download the conversation
        const formattedDate = formatDateForFilename();
        const chatTitle = conversationDetails.name || "untitled";
        const safeTitle = chatTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await downloadJson(
            conversationDetails, 
            `${formattedDate}_claude_chat_${safeTitle}.json`
        );
        
        // Show success notification
        await showNotification(
            "HumainLabs Claude Backup", 
            `Successfully exported "${chatTitle}"!`
        );
    } catch (error) {
        bgLogger.error("Error exporting current chat:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await showNotification(
            "HumainLabs Claude Backup Error", 
            `Failed to export current chat: ${errorMessage}`,
            true
        );
    }
}

// Export all conversations
async function exportConversations() {
    try {
        const organizationId = await getCookie();
        if (!organizationId) {
            await showNotification(
                "HumainLabs Claude Backup Error", 
                "Required cookie not found. Please make sure you're logged into Claude.ai.",
                true
            );
            return;
        }

        const conversations = await fetchConversations(organizationId);
        const detailedConversations = await fetchAllConversationDetails(organizationId, conversations);

        // Download all conversations
        const formattedDate = formatDateForFilename();
        await downloadJson(
            detailedConversations, 
            `${formattedDate}_claude_all_conversations.json`
        );
        
        // Show success notification
        await showNotification(
            "HumainLabs Claude Backup", 
            `Successfully exported ${detailedConversations.length} conversations!`
        );
    } catch (error) {
        bgLogger.error("Error exporting conversations:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await showNotification(
            "HumainLabs Claude Backup Error", 
            `Failed to export conversations: ${errorMessage}`,
            true
        );
    }
}

// Export current ChatGPT chat from the active tab
async function exportCurrentChatGPT() {
    try {
        // Get current active tab
        const tabs = await bgBrowserAPI.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0] as Tab;
        
        // Check for both old and new URL formats
        if (!currentTab.url || 
            !(currentTab.url.includes('chatgpt.com/c/') || 
              currentTab.url.match(/chatgpt\.com\/g\/[^/]+\/c\//))) {
            const errorMsg = "Please open a ChatGPT conversation before using this feature.";
            bgLogger.error(errorMsg);
            await showNotification(
                "HumainLabs ChatGPT Backup Error", 
                errorMsg,
                true
            );
            return;
        }
        
        // Extract the thread ID from the URL
        const threadId = getChatGPTThreadId(currentTab.url);
        if (!threadId) {
            const errorMsg = "Could not identify the conversation ID from the current page.";
            bgLogger.error(errorMsg, "URL:", currentTab.url);
            await showNotification(
                "HumainLabs ChatGPT Backup Error", 
                errorMsg,
                true
            );
            return;
        }
        
        bgLogger.log("Fetching ChatGPT conversation with ID:", threadId);
        
        // Get the conversation data
        const conversationData = await getChatGPTConversation(threadId);
        
        // Prepare for download
        const exportData = prepareChatGPTDownload(threadId, conversationData);
        
        // Download the JSON file
        const blob = new Blob([exportData.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        await bgBrowserAPI.downloads.download({
            url: url,
            filename: exportData.filename,
            saveAs: true
        });
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        // Show success notification
        const successMsg = "Successfully exported ChatGPT conversation!";
        bgLogger.log(successMsg);
        await showNotification(
            "HumainLabs ChatGPT Backup", 
            successMsg
        );
    } catch (error) {
        bgLogger.error("Error exporting ChatGPT chat:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await showNotification(
            "HumainLabs ChatGPT Backup Error", 
            `Failed to export ChatGPT chat: ${errorMessage}`,
            true
        );
    }
}

// Handle messages from the popup
bgBrowserAPI.runtime.onMessage.addListener((message: any, sender: MessageSender) => {
    bgLogger.log("Received message:", message.action);
    if (message.action === "exportConversations") {
        exportConversations();
    } else if (message.action === "exportCurrentChat") {
        exportCurrentChat();
    } else if (message.action === "exportCurrentChatGPT") {
        exportCurrentChatGPT();
    }
});
