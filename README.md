# Form Genie

## Elevator Pitch
Form Genie is a privacy-first Chrome extension powered by on-device Gemini Nano that intelligently auto-fills even the most complex and frustrating web forms, transforming data on-the-fly to match any format, for any language.

## The Problem: "Form Frustration" is Universal
We've all faced it: web forms that reject our saved auto-fill data.
*   **Phone numbers** split into three separate boxes.
*   **Addresses** that need a separate field for your apartment number.
*   **Names** that must be entered without special characters like apostrophes.
*   **Dates** that require a specific format (`MM/DD/YYYY` vs `DD/MM/YYYY`).

This problem is especially severe on Japanese websites, which often require names in multiple scripts (Kanji, Katakana, Hiragana) and have complex address structures. This isn't just a Japanese issue; it's a global symptom of websites having inconsistent standards, causing universal user frustration.

## Our Solution: Context-Aware, On-Device AI
Form Genie doesn't just blindly paste saved text. It uses the power of **Gemini Nano**, running directly in the browser, to **understand the context** of each form field.

By analyzing HTML elements like `<label>`, `placeholder`, and `name` attributes, it intelligently determines what the website is asking for. Then, it dynamically reformats your saved personal information to fit perfectly, saving you time and eliminating errors. Because it all happens on-device, your personal data **never leaves your computer**, guaranteeing complete privacy.

## How It Works: A Seamless User Experience
1.  **Initial Setup:** A one-time setup where the user saves their information (e.g., name, address, phone) in both their native language and English within different profiles (e.g., "Home," "Work").

2.  **Automatic Detection:** Upon visiting a page with a form, Form Genie automatically detects and analyzes the form fields in the background.

3.  **Intelligent Highlighting:** Fields it can confidently fill are subtly highlighted, and a single "Fill with Form Genie" button appears near the form. This visually communicates to the user that the AI is ready to help.

4.  **One-Click Magic:** The user clicks the button.

5.  **Visualize the AI:** A brief, engaging animation is displayed. This provides visual feedback that Gemini Nano is processing the request on-device, "thinking" about the best way to fill the form.

6.  **Perfect Completion:** The form is instantly and accurately filled with correctly formatted data—phone numbers are split, names are converted to the right script, and addresses are correctly segmented.

## Key Features & Selling Points
*   **Contextual Understanding:** Moves beyond simple pattern matching to truly understand form requirements.
*   **Dynamic Data Formatting:** Converts a single piece of saved data into multiple formats on the fly.
*   **100% On-Device & Private:** All processing is done by Gemini Nano in the browser. User data is never sent to the cloud.
*   **Cross-Cultural Capability:** Built to handle the extreme complexity of Japanese forms, making it robust enough for any web form in the world.
*   **Intuitive & Proactive UX:** The user doesn't need to click the extension icon. The AI proactively shows when it can help, right on the page.

## Tech Stack
*   **Platform:** Google Chrome Extension (Manifest V3)
*   **Core AI:** Gemini Nano (via Chrome's built-in `Prompt API`)
*   **Frontend:** JavaScript, HTML, CSS