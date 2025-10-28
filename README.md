# Form Genie ✨

**Privacy-first Chrome extension that intelligently auto-fills web forms using on-device AI**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/michitomo/form-genie)
[![Gemini Nano](https://img.shields.io/badge/Powered%20by-Gemini%20Nano-8E75B2)](https://developer.chrome.com/docs/ai/built-in)
[![Privacy First](https://img.shields.io/badge/Privacy-First-success)](https://github.com/michitomo/form-genie)

## 🎯 The Problem

We've all experienced the frustration:
- **Phone numbers** that need specific formatting: `(123) 456-7890` vs `123-456-7890`
- **Addresses** split across multiple fields (street, apartment, city, state, zip)
- **Dates** in different formats: `MM/DD/YYYY` vs `DD/MM/YYYY` vs `YYYY-MM-DD`
- **Fields with regex patterns** that reject your auto-fill data
- **Select dropdowns** requiring exact value matches

Traditional auto-fill tools fail because they can't **understand context** or **transform data** to match specific requirements.

## 💡 The Solution

Form Genie uses **Gemini Nano**—Google's most efficient AI model—running **100% on-device** to intelligently analyze and fill forms:

### Smart Field Analysis
Examines HTML attributes (`label`, `placeholder`, `name`, `pattern`, `type`) to understand what each field expects

### Context-Aware Transformation
Dynamically reformats your saved data to match any requirement:
- Splits addresses into separate fields
- Reformats phone numbers with or without country codes
- Converts dates between formats
- Handles regex patterns and validation rules

### Two-Stage AI Pipeline
1. **Initial Fill** (Temperature: 0.5) - Deterministic, accurate first pass
2. **Smart Validation Fix** (Temperature: 0.8) - Creative problem-solving for edge cases

### Zero Privacy Concerns
All AI processing happens in your browser. Your data never leaves your device.

## 🚀 How It Works

### 1. One-Time Setup
Save your information once in the extension popup:
- Full name
- Email address
- Phone number
- Physical address
- Birth date

### 2. Right-Click to Fill
On any webpage with a form, simply:
1. Right-click anywhere on the page
2. Select **"✨ Fill with Form Genie"**
3. Watch the magic happen

### 3. AI in Action
A sleek loading indicator shows Gemini Nano analyzing the form:
```
Form Genie is thinking...
```

### 4. Instant Results
The form fills perfectly—with proper formatting, split fields, and validated data.

## 🎨 Key Features

### ✅ Intelligent Field Mapping
- Analyzes form metadata to understand field requirements
- Handles complex fields like dropdowns and pattern-validated inputs
- Gracefully skips fields without relevant data

### ✅ Adaptive Data Formatting
- Phone: `+1-234-567-8900` → `(234) 567-8900`
- Date: `1990-01-15` → `01/15/1990`
- Address: Single string → Street, Apt, City, State, ZIP

### ✅ Smart Validation Recovery
- Detects validation errors automatically
- Re-prompts AI with specific constraints
- Fixes edge cases like maxlength, regex patterns, dropdown options

### ✅ Complete Privacy
- All processing via Chrome's built-in AI APIs
- No external API calls
- No data ever leaves your browser

### ✅ Universal Compatibility
- Works on any website
- Handles forms with or without `<form>` tags
- Supports all major input types

## 🛠️ Tech Stack

- **Platform:** Chrome Extension (Manifest V3)
- **AI Engine:** Gemini Nano via [Chrome's Prompt API](https://developer.chrome.com/docs/ai/built-in)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Architecture:** Event-driven with service worker background script

## 📦 Installation & Setup

### Prerequisites
Form Genie requires Chrome's experimental AI features:

1. Use **Chrome Canary** or **Chrome Dev** (version 127+)
2. Enable the following flags in `chrome://flags`:
   - `#optimization-guide-on-device-model` → **Enabled**
   - `#prompt-api-for-gemini-nano` → **Enabled**
3. Restart Chrome
4. Verify Gemini Nano is ready: Open DevTools Console and run:
   ```javascript
   (await ai.languageModel.availability()) === 'readily'
   ```

### Installing the Extension

1. Clone this repository:
   ```bash
   git clone https://github.com/michitomo/form-genie.git
   cd form-genie
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right corner)

4. Click **"Load unpacked"** and select the `form-genie` folder

5. Click the extension icon and set up your profile

### Setting Up Your Profile

1. Click the Form Genie extension icon in Chrome toolbar
2. Fill in your information:
   - Full Name
   - Email Address
   - Phone Number (in any format)
   - Physical Address (full address in one field)
   - Birth Date (YYYY-MM-DD format)
3. Click **Save Profile**

That's it! You're ready to auto-fill forms.

## 🎮 Demo Forms

Test Form Genie with our demo forms hosted on GitHub Pages:

### 🇺🇸 US Forms
- **[Simple Registration Form](https://michitomo.github.io/form-genie/us-form1.html)** - Basic name, email, phone fields
- **[Complex Registration Form](https://michitomo.github.io/form-genie/us-form2.html)** - Split address fields, formatted phone, date validation

### 🇯🇵 Japanese Form
- **[Japanese Registration Form](https://michitomo.github.io/form-genie/jp-form1.html)** - Multi-script names, Japanese address structure

#### Deploying Demo Forms
The demo forms are hosted via GitHub Pages:

1. Go to repository Settings → Pages
2. Source: Deploy from branch `main` / `root` folder
3. Save and wait for deployment
4. Access at: `https://[username].github.io/form-genie/`

## 🏗️ Architecture

### Extension Components

```
form-genie/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (context menu handler)
├── content.js             # Core logic (injected into web pages)
├── popup.html/js/css      # User profile management UI
└── demo forms/            # Test forms (us-form1/2, jp-form1)
```

### AI Pipeline Flow

```
User Triggers Fill
       ↓
[Extract Field Metadata]
- Labels, placeholders, patterns
- Input types, validation rules
- Dropdown options
       ↓
[Create AI Session - Fill Mode]
Temperature: 0.5, TopK: 10
       ↓
[Generate Context-Aware Prompt]
- User profile data
- Field requirements
- Formatting rules
       ↓
[Gemini Nano Processing]
On-device inference
       ↓
[Parse JSON Response]
Field name → Value mapping
       ↓
[Apply Values to Form]
       ↓
[Validate Results]
       ↓
[Detect Validation Errors] ─ No errors → Done ✓
       ↓
    YES errors
       ↓
[Create AI Session - Fix Mode]
Temperature: 0.8, TopK: 50
       ↓
[Generate Fix Prompt]
Specific constraints only
       ↓
[Gemini Nano Re-processing]
Creative problem solving
       ↓
[Apply Fixed Values]
       ↓
     Done ✓
```

### Key Design Decisions

#### Two-Stage AI Approach
- **Stage 1 (Fill):** Lower temperature for consistent, predictable results
- **Stage 2 (Fix):** Higher temperature for creative problem-solving on validation errors

#### Prompt Engineering
- Explicit field metadata extraction
- JSON-only output format (no prose)
- Context-aware constraint descriptions
- Profile data as ground truth

#### Error Handling
- Client-side validation before submission
- Automatic retry with adjusted prompts
- Graceful degradation (skip unfillable fields)

## 🎯 Hackathon Highlights

### What Makes Form Genie Special

1. **Real-World Problem Solving**
   - Addresses genuine user pain point
   - Saves time on every form interaction
   - Reduces form abandonment rates

2. **Privacy-First Architecture**
   - No external API calls
   - No data collection or tracking
   - Complete user control over data

3. **Innovative AI Application**
   - Two-stage pipeline (fill + fix)
   - Context-aware prompt generation
   - Smart validation recovery

4. **Production-Ready Code**
   - Clean, modular architecture
   - Comprehensive error handling
   - Well-documented codebase

5. **Universal Applicability**
   - Works on any website
   - Handles edge cases (no `<form>` tags, complex validations)
   - Extensible for future enhancements

## 🔮 Future Enhancements

- **Multi-language support** - Save profiles in multiple languages
- **Custom field mappings** - User-defined transformation rules
- **Form learning** - Remember site-specific field patterns
- **Confidence indicators** - Visual feedback on fill accuracy
- **Browser extension store** - Publish to Chrome Web Store
- **Cross-browser support** - Firefox, Edge compatibility


## 👨‍💻 Author

Built with ❤️ for the [Google Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)

**Michitomo** - [GitHub](https://github.com/michitomo)
