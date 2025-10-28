// content.js - Form Genie Content Script

// Inject CSS
const style = document.createElement('style');
style.textContent = `
  .form-genie-highlight {
    border: 2px solid #007bff !important;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5) !important;
  }
  .form-genie-loading {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 10px;
    z-index: 10000;
    display: none;
  }
`;
document.head.appendChild(style);

// Detect forms and analyze fields
function detectForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    let canFill = false;
    inputs.forEach(input => {
      // Simple check: if input has name or id, assume it can be filled
      if (input.name || input.id) {
        canFill = true;
        input.classList.add('form-genie-highlight');
      }
    });
    if (canFill) {
      // Add tooltip to indicate right-click functionality
      addFormTooltip(form);
    }
  });
}

// Add tooltip to indicate right-click functionality
function addFormTooltip(form) {
  const tooltip = document.createElement('div');
  tooltip.textContent = 'Right-click anywhere on the page to fill forms with Form Genie ✨';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(102, 126, 234, 0.95);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  `;

  const rect = form.getBoundingClientRect();
  tooltip.style.top = `${rect.top - 35}px`;
  tooltip.style.left = `${rect.left}px`;

  document.body.appendChild(tooltip);

  // Show tooltip briefly when form is detected
  setTimeout(() => {
    tooltip.style.opacity = '1';
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        if (tooltip.parentNode) {
          document.body.removeChild(tooltip);
        }
      }, 300);
    }, 3000);
  }, 500);
}

// Fill the form using AI
async function fillForm(form) {
  // Get user profile from storage
  const { profile } = await chrome.storage.local.get('profile');
  if (!profile) {
    alert('Please set up your profile in the Form Genie popup.');
    return;
  }

  // Check if AI is available
  const available = await LanguageModel.availability();
  if (available === 'unavailable') {
    alert('Form Genie requires Chrome\'s experimental AI features. Please enable them in chrome://flags/#enable-experimental-web-platform-features and chrome://flags/#optimization-guide-on-device-model.');
    return;
  }

  // Show loading
  const loading = document.createElement('div');
  loading.className = 'form-genie-loading';
  loading.textContent = 'Form Genie is thinking...';
  document.body.appendChild(loading);
  loading.style.display = 'block';

  const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
  
  // Process all fields at once instead of grouping
  await fillGroup(inputs, profile);

  // Hide loading
  loading.style.display = 'none';
  document.body.removeChild(loading);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillAllForms") {
    // Fill all forms on the page
    fillAllForms();
  }
});

// Fill all forms on the page
async function fillAllForms() {
  const forms = document.querySelectorAll('form');
  if (forms.length === 0) {
    // If no forms found, look for input elements in containers
    const inputs = document.querySelectorAll('input, textarea, select');
    if (inputs.length > 0) {
      // Group inputs by their container
      const containers = new Map();
      inputs.forEach(input => {
        if (input.name || input.id) {
          const container = input.closest('div, section, article, form') || document.body;
          if (!containers.has(container)) {
            containers.set(container, []);
          }
          containers.get(container).push(input);
        }
      });

      // Fill each group of inputs
      for (const [container, inputGroup] of containers) {
        if (inputGroup.length > 0) {
          await fillFormInputs(inputGroup);
        }
      }
    }
  } else {
    // Fill each form
    for (const form of forms) {
      await fillForm(form);
    }
  }
}

// Fill a group of inputs (when no form element exists)
async function fillFormInputs(inputs) {
  // Get user profile from storage
  const { profile } = await chrome.storage.local.get('profile');
  if (!profile) {
    alert('Please set up your profile in the Form Genie popup.');
    return;
  }

  // Check if AI is available
  const available = await LanguageModel.availability();
  if (available === 'unavailable') {
    alert('Form Genie requires Chrome\'s experimental AI features. Please enable them in chrome://flags/#enable-experimental-web-platform-features and chrome://flags/#optimization-guide-on-device-model.');
    return;
  }

  // Show loading
  const loading = document.createElement('div');
  loading.className = 'form-genie-loading';
  loading.textContent = 'Form Genie is thinking...';
  document.body.appendChild(loading);
  loading.style.display = 'block';

  // Process all fields at once
  await fillGroup(inputs, profile);

  // Hide loading
  loading.style.display = 'none';
  document.body.removeChild(loading);
}

// Group related fields
function groupFields(inputs) {
  const groups = {};
  inputs.forEach(input => {
    const name = input.name || input.id || '';
    // Special handling for name fields
    if (name.includes('lastname') || name.includes('firstname') || name.includes('LastName') || name.includes('FirstName')) {
      // Group all name-related fields together
      if (!groups['name']) groups['name'] = [];
      groups['name'].push(input);
    } else {
      // Group by base name (remove trailing numbers)
      const base = name.replace(/\d+$/, '');
      if (!groups[base]) groups[base] = [];
      groups[base].push(input);
    }
  });
  // Return groups, including single fields
  return Object.values(groups);
}

// Fill a group of fields
async function fillGroup(group, profile) {
  const fieldData = group.map(input => ({
    label: getLabelForInput(input),
    placeholder: input.placeholder || '',
    name: input.name || '',
    type: input.type || input.tagName.toLowerCase(),
    pattern: input.pattern || '',
    maxlength: input.maxLength > 0 ? input.maxLength : null,
    title: input.title || '',
    ...(input.tagName === 'SELECT' && {
      options: Array.from(input.options).map(option => ({
        value: option.value,
        text: option.textContent.trim()
      }))
    })
  }));

  const prompt = `You are a form-filling assistant. Fill out form fields based on the user's profile.

USER PROFILE:
${JSON.stringify(profile)}

FORM FIELDS (${fieldData.length} fields):
${fieldData.map((f, i) => `${i + 1}. ${f.name || 'field' + i} (${f.type}): label="${f.label}" placeholder="${f.placeholder}" pattern="${f.pattern}" title="${f.title}"`).join('\n')}

CRITICAL RULES:
1. You MUST return EXACTLY ${fieldData.length} values in a JSON array
2. Each value corresponds to one field in the order listed above
3. Count carefully: there are ${fieldData.length} fields, so you need ${fieldData.length} values

FIELD-SPECIFIC INSTRUCTIONS:
- firstName/lastName: Split fullName "${profile.fullName}". If pattern="[A-Za-z]+" remove all non-letter characters (O'Reilly → OReilly)
- email: Use email from profile
- countryCode: Extract country code from phone (e.g., "+1")
- areaCode: Extract area code from phone (e.g., "619")
- phoneNumber: Extract rest of phone formatted as needed (e.g., "618-8705")
- dobMonth: Extract month from birthDate as 2-digit value (e.g., "03")
- dobDay: Extract day from birthDate as 2-digit value (e.g., "22")
- dobYear: Extract year from birthDate as 4-digit value (e.g., "1995")
- addressLine1: Street address without apartment
- addressLine2: Apartment/suite number only
- city: City name
- state: State abbreviation (e.g., "CA")
- zip: ZIP code (5 digits)
- password/confirmPassword: Leave as empty string ""

For SELECT fields, return the VALUE (not text) that matches. Check the options list carefully.

RESPONSE FORMAT:
Return ONLY a JSON array with EXACTLY ${fieldData.length} string values. No explanations, no markdown, no extra text.
Correct format: ["value1", "value2", ..., "value${fieldData.length}"]`;

  try {
    const session = await LanguageModel.create({
        temperature: 0.1,
        topK: 1,
    });
    const result = await session.prompt(prompt);
    console.log('AI prompt:', prompt);
    console.log('AI result:', result);
    const cleanedResult = extractJSON(result.trim());
    console.log('Cleaned result:', cleanedResult);
    const values = JSON.parse(cleanedResult);

    // Validate that we got the right number of values
    if (values.length !== group.length) {
      console.error(`Expected ${group.length} values but got ${values.length}`);
      console.error('Field names:', group.map(input => input.name || input.id));
      console.error('Values received:', values);
      alert(`Form filling error: Expected ${group.length} values but AI returned ${values.length}. Please check console for details.`);
      return;
    }

    group.forEach((input, index) => {
      if (values[index]) {
        if (input.tagName === 'SELECT') {
          // For select elements, find the option that matches the value or text
          const value = values[index];
          let selectedOption = null;
          for (const option of input.options) {
            if (option.value === value || option.textContent.trim() === value) {
              selectedOption = option;
              break;
            }
          }
          if (selectedOption) {
            input.value = selectedOption.value;
          }
        } else {
          input.value = values[index];
        }
      }
    });
  } catch (error) {
    console.error('AI error:', error);
    console.error('AI result was:', result);
    alert('Error using AI: ' + error.message);
  }
}

// Extract JSON from AI response, handling markdown formatting
function extractJSON(text) {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*(\[.*\])\s*```/s);
  if (jsonMatch) {
    return jsonMatch[1];
  }
  // If no markdown, assume it's plain JSON
  return text;
}

// Get label for input
function getLabelForInput(input) {
  const label = document.querySelector(`label[for="${input.id}"]`);
  return label ? label.textContent : '';
}

// Run on load
detectForms();

// Also run on dynamic content changes if needed
// For simplicity, assume static forms