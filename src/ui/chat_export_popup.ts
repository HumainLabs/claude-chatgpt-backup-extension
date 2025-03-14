// Define the types we need without imports
type Browser = any;

// Use browser from globalThis for Firefox compatibility
declare const browser: Browser;

document.addEventListener('DOMContentLoaded', () => {
    const exportConversationsBtn = document.getElementById('exportConversationsBtn');
    const exportCurrentChatBtn = document.getElementById('exportCurrentChatBtn');

    if (exportConversationsBtn) {
        exportConversationsBtn.addEventListener('click', () => {
            browser.runtime.sendMessage({ action: "exportConversations" });
        });
    }

    if (exportCurrentChatBtn) {
        exportCurrentChatBtn.addEventListener('click', () => {
            browser.runtime.sendMessage({ action: "exportCurrentChat" });
        });
    }
});
