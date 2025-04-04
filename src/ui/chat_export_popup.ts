// Define the types we need without imports
interface PopupCustomBrowser {
  runtime: any;
}

// Type assertion for the existing browser global
const popupBrowserAPI = (window as any).browser as PopupCustomBrowser;

// Simple logger that always logs errors - with unique name for popup
const popupLogger = {
  error: (message: string, ...args: any[]) => {
    console.error(`[HumainLabs Popup] ${message}`, ...args);
  },
  log: (message: string, ...args: any[]) => {
    // Only log in development or testing
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.log(`[HumainLabs Popup] ${message}`, ...args);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
    popupLogger.log('Popup initialized');
    
    const exportConversationsBtn = document.getElementById('exportConversationsBtn');
    const exportCurrentChatBtn = document.getElementById('exportCurrentChatBtn');
    const exportCurrentChatGPTBtn = document.getElementById('exportCurrentChatGPTBtn');

    if (exportConversationsBtn) {
        exportConversationsBtn.addEventListener('click', () => {
            popupLogger.log('Clicked: Export All Claude Conversations');
            popupBrowserAPI.runtime.sendMessage({ action: "exportConversations" });
        });
    }

    if (exportCurrentChatBtn) {
        exportCurrentChatBtn.addEventListener('click', () => {
            popupLogger.log('Clicked: Export Current Claude Chat');
            popupBrowserAPI.runtime.sendMessage({ action: "exportCurrentChat" });
        });
    }

    if (exportCurrentChatGPTBtn) {
        exportCurrentChatGPTBtn.addEventListener('click', () => {
            popupLogger.log('Clicked: Export Current ChatGPT Chat');
            popupBrowserAPI.runtime.sendMessage({ action: "exportCurrentChatGPT" });
        });
    }
});
