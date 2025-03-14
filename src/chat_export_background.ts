// Instead of importing the types, we'll just declare them directly
// This avoids the "exports is not defined" error

// Define the types we need without imports
type Browser = any;
type Cookie = {
  name: string;
  value: string;
};
type MessageSender = any;

// Use browser from globalThis for Firefox compatibility
declare const browser: Browser;

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

async function fetchAllConversationDetails(organizationId: string, conversations: ClaudeConversation[]): Promise<any[]> {
    const detailPromises = conversations.map(conv =>
        fetch(`https://claude.ai/api/organizations/${organizationId}/chat_conversations/${conv.uuid}`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        }).then(async response => {
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }
            return response.json();
        })
    );
    return await Promise.all(detailPromises);
}

async function exportConversations() {
    try {
        const organizationId = await getCookie();
        if (!organizationId) {
            const errorMsg = "Required cookie not found. Please make sure you're logged into Claude.ai before using this extension.";
            console.error(errorMsg);
            await browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL("icons/icon48.png"),
                title: "Claude Chat Backup Error",
                message: errorMsg
            });
            return;
        }

        const conversations = await fetchConversations(organizationId);
        const detailedConversations = await fetchAllConversationDetails(organizationId, conversations);

        const jsonData = JSON.stringify(detailedConversations, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Please don't ask, just use a proper language or one of the bazillion libraries if you see this.
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const timezoneOffset = -now.getTimezoneOffset() / 60;
        const formattedDate = `${year}-${month}-${day}T${hours}${minutes}${timezoneOffset >= 0 ? '+' : '-'}${Math.abs(timezoneOffset)}`;

        const filename = `${formattedDate}_claude_conversations_export.json`;
        await browser.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        });
        URL.revokeObjectURL(url);
        
        // Show success notification
        await browser.notifications.create({
            type: "basic",
            iconUrl: browser.runtime.getURL("icons/icon48.png"),
            title: "Claude Chat Backup",
            message: "Successfully exported your conversations!"
        });
    } catch (error) {
        console.error("Error exporting conversations:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await browser.notifications.create({
            type: "basic",
            iconUrl: browser.runtime.getURL("icons/icon48.png"),
            title: "Claude Chat Backup Error",
            message: `Failed to export conversations: ${errorMessage}`
        });
    }
}

// Fix the message listener signature to match the expected types
browser.runtime.onMessage.addListener((message: any, sender: MessageSender) => {
    if (message.action === "exportConversations") {
        exportConversations();
    }
});
