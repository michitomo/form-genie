// background.js - Form Genie Background Script

// Initialize if needed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Form Genie installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    handleFillForm(request, sendResponse);
    return true; // Keep the message channel open for async response
  }
});

async function handleFillForm(request, sendResponse) {
  const { profile, fieldData } = request;

  // Check if AI is available
  if (!chrome.ai || !chrome.ai.languageModel) {
    sendResponse({ success: false, error: 'AI not available. Please enable experimental AI features.' });
    return;
  }

  try {
    const session = await LanguageModel.create({
        temperature: 0.2,
        topK: 2,
    });
    const values = [];

    for (const field of fieldData) {
      const prompt = `Based on the label "${field.label}", placeholder "${field.placeholder}", and name "${field.name}", should this field be automatically filled with personal data from this profile? Profile: ${JSON.stringify(profile)}. Fields like passwords, security codes, referral codes, or verification codes should not be filled. If it should be filled, respond with the exact value. If not, respond with "SKIP".`;
      const result = await session.prompt(prompt);
      values.push(result.trim() === "SKIP" ? "" : result.trim());
    }

    sendResponse({ success: true, values });
  } catch (error) {
    console.error('AI error:', error);
    sendResponse({ success: false, error: error.message });
  }
}