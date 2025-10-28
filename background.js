// background.js - Form Genie Background Script

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fill-form",
    title: "✨ Fill with Form Genie",
    contexts: ["page"],
    documentUrlPatterns: ["<all_urls>"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fill-form") {
    // Send message to content script to fill all forms on the page
    chrome.tabs.sendMessage(tab.id, {
      action: "fillAllForms"
    });
  }
});