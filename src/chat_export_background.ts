// Instead of importing the types, we'll just declare them directly
// This avoids the "exports is not defined" error

// Define the types we need without imports
type Browser = any;
type Cookie = {
  name: string;
  value: string;
};
type MessageSender = any;
type Tab = {
  url: string;
  id?: number;
};

// Use browser from globalThis for Firefox compatibility
declare const browser: Browser;

// ===== ChatGPT Export Functionality =====
// Constants for ChatGPT
const DOMAIN_CHATGPT = "chatgpt.com";
const DEBUG = false;

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
  const match = url.match(/c\/([\w-]+)/);
  return match ? match[1] : null;
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
    const cookie = await browser.cookies.get({
        url: 'https://claude.ai',
        name: 'lastActiveOrg'
    });
    return cookie ? cookie.value : null;
}

// New function to get all cookies for authentication
async function getAuthCookies(): Promise<Record<string, string>> {
    const cookies = await browser.cookies.getAll({ url: 'https://claude.ai' });
    return cookies.reduce((obj: Record<string, string>, cookie: Cookie) => {
        obj[cookie.name] = cookie.value;
        return obj;
    }, {});
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
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    await browser.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    });
    URL.revokeObjectURL(url);
}

// Show a notification
async function showNotification(title: string, message: string, isError: boolean = false): Promise<void> {
    await browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon48.png"),
        title: isError ? `HumainLabs Claude Backup Error` : `HumainLabs Claude Backup`,
        message: message
    });
}

// Export current chat from the active tab
async function exportCurrentChat() {
    try {
        // Get current active tab
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0] as Tab;
        
        if (!currentTab.url || !currentTab.url.includes('claude.ai/chat')) {
            await showNotification(
                "HumainLabs Claude Backup Error", 
                "Please open a Claude.ai chat before using this feature.",
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
        console.error("Error exporting current chat:", error);
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
        console.error("Error exporting conversations:", error);
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
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0] as Tab;
        
        if (!currentTab.url || !currentTab.url.includes('chatgpt.com/c/')) {
            await showNotification(
                "HumainLabs ChatGPT Backup Error", 
                "Please open a ChatGPT conversation before using this feature.",
                true
            );
            return;
        }
        
        // Extract the thread ID from the URL
        const threadId = getChatGPTThreadId(currentTab.url);
        if (!threadId) {
            await showNotification(
                "HumainLabs ChatGPT Backup Error", 
                "Could not identify the conversation ID from the current page.",
                true
            );
            return;
        }
        
        // Get the conversation data
        const conversationData = await getChatGPTConversation(threadId);
        
        // Prepare for download
        const exportData = prepareChatGPTDownload(threadId, conversationData);
        
        // Download the JSON file
        const blob = new Blob([exportData.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        await browser.downloads.download({
            url: url,
            filename: exportData.filename,
            saveAs: true
        });
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        // Show success notification
        await showNotification(
            "HumainLabs ChatGPT Backup", 
            "Successfully exported ChatGPT conversation!"
        );
    } catch (error) {
        console.error("Error exporting ChatGPT chat:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await showNotification(
            "HumainLabs ChatGPT Backup Error", 
            `Failed to export ChatGPT chat: ${errorMessage}`,
            true
        );
    }
}

// Handle messages from the popup
browser.runtime.onMessage.addListener((message: any, sender: MessageSender) => {
    if (message.action === "exportConversations") {
        exportConversations();
    } else if (message.action === "exportCurrentChat") {
        exportCurrentChat();
    } else if (message.action === "exportCurrentChatGPT") {
        exportCurrentChatGPT();
    }
});
