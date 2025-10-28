// content.js - Form Genie Content Script

// ========================================
// CONFIGURATION
// ========================================

const AI_CONFIG = {
  // Configuration for initial form filling (more deterministic)
  FILL: {
    temperature: 0.5,
    topK: 10,
  },
  // Configuration for fixing validation errors (slightly more creative)
  FIX: {
    temperature: 0.8,
    topK: 50,
  }
};

// ========================================
// INITIALIZATION
// ========================================

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
    background: rgba(18, 18, 18, 0.9);
    color: #fff;
    padding: 16px 18px;
    border-radius: 12px;
    z-index: 10000;
    display: none;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    -webkit-backdrop-filter: saturate(150%) blur(2px);
    backdrop-filter: saturate(150%) blur(2px);
  }
  .form-genie-loading .fg-inner {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .form-genie-loading .fg-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: fg-spin 0.8s linear infinite;
    flex: 0 0 auto;
  }
  .form-genie-loading .fg-label {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.2px;
    color: #f5f5f5;
    display: inline-flex;
    align-items: baseline;
  }
  .form-genie-loading .fg-dot {
    display: inline-block;
    width: 4px;
    margin-left: 2px;
    opacity: 0;
    animation: fg-blink 1.4s infinite;
  }
  .form-genie-loading .fg-dot.dot2 { animation-delay: 0.2s; }
  .form-genie-loading .fg-dot.dot3 { animation-delay: 0.4s; }
  @keyframes fg-spin { to { transform: rotate(360deg); } }
  @keyframes fg-blink {
    0%, 20% { opacity: 0; }
    30%, 60% { opacity: 1; }
    70%, 100% { opacity: 0; }
  }
`;
document.head.appendChild(style);

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if AI is available on this browser
 * @returns {Promise<boolean>}
 */
async function checkAIAvailability() {
  const available = await LanguageModel.availability();
  if (available === 'unavailable') {
    alert('Form Genie requires Chrome\'s experimental AI features. Please enable them in chrome://flags/#enable-experimental-web-platform-features and chrome://flags/#optimization-guide-on-device-model.');
    return false;
  }
  return true;
}

/**
 * Get user profile from storage
 * @returns {Promise<Object|null>}
 */
async function getUserProfile() {
  const { profile } = await chrome.storage.local.get('profile');
  if (!profile) {
    alert('Please set up your profile in the Form Genie popup.');
    return null;
  }
  return profile;
}

/**
 * Show loading indicator
 * @returns {HTMLElement}
 */
function showLoading() {
  const loading = document.createElement('div');
  loading.className = 'form-genie-loading';
  loading.setAttribute('role', 'status');
  loading.setAttribute('aria-live', 'polite');
  loading.innerHTML = `
    <div class="fg-inner">
      <div class="fg-spinner" aria-hidden="true"></div>
      <div class="fg-label">Form Genie is thinking<span class="fg-dot dot1">.</span><span class="fg-dot dot2">.</span><span class="fg-dot dot3">.</span></div>
    </div>
  `;
  document.body.appendChild(loading);
  loading.style.display = 'block';
  return loading;
}

/**
 * Hide and remove loading indicator
 * @param {HTMLElement} loading
 */
function hideLoading(loading) {
  if (loading && loading.parentNode) {
    loading.style.display = 'none';
    document.body.removeChild(loading);
  }
}

/**
 * Extract JSON from AI response, handling markdown formatting
 * @param {string} text
 * @returns {string}
 */
function extractJSON(text) {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text;
}

/**
 * Get label text for an input element
 * @param {HTMLElement} input
 * @returns {string}
 */
function getLabelForInput(input) {
  const label = document.querySelector(`label[for="${input.id}"]`);
  return label ? label.textContent : '';
}

/**
 * Create an AI session with specified configuration
 * @param {Object} config - Configuration object with temperature and topK
 * @returns {Promise<Object>}
 */
async function createAISession(config) {
  return await LanguageModel.create(config);
}

/**
 * Prompt AI and get response
 * @param {Object} session - AI session
 * @param {string} prompt - Prompt text
 * @param {string} logLabel - Label for logging
 * @returns {Promise<string>}
 */
async function promptAI(session, prompt, logLabel = 'AI') {
  console.log(`${logLabel} prompt:`, prompt);
  const result = await session.prompt(prompt);
  console.log(`${logLabel} result:`, result);
  return result;
}

// ========================================
// FIELD METADATA FUNCTIONS
// ========================================

/**
 * Extract metadata from form fields
 * @param {HTMLElement[]} fields
 * @returns {Object[]}
 */
function extractFieldMetadata(fields) {
  return fields.map(input => {
    const baseData = {
      label: getLabelForInput(input),
      placeholder: input.placeholder || '',
      name: input.name || '',
      type: input.type || input.tagName.toLowerCase(),
      pattern: input.pattern || '',
      maxlength: input.maxLength > 0 ? input.maxLength : null,
      title: input.title || '',
      required: Boolean(input.required)
    };
    
    if (input.tagName === 'SELECT') {
      const optionCount = input.options.length;
      baseData.selectType = `select with ${optionCount} options`;
      if (optionCount > 5) {
        baseData.sampleOptions = Array.from(input.options).slice(0, 3).map(opt => opt.value).join(', ') + '...';
      } else {
        baseData.availableValues = Array.from(input.options).map(opt => opt.value);
      }
    }
    
    return baseData;
  });
}

/**
 * Create field summary text for AI prompt
 * @param {Object[]} fieldData
 * @param {string[]} fieldNames
 * @returns {string}
 */
function createFieldSummary(fieldData, fieldNames) {
  return fieldData.map((f, i) => {
    let desc = `${i + 1}. ${fieldNames[i]} (type: ${f.type}`;
    if (f.label) desc += `, label: "${f.label.trim()}"`;
    if (f.placeholder) desc += `, placeholder: "${f.placeholder}"`;
    desc += `, required: ${f.required})`;
    if (f.pattern) desc += ` pattern: ${f.pattern}`;
    if (f.title) desc += ` hint: ${f.title}`;
    if (f.selectType) desc += ` select: ${f.selectType}`;
    if (f.availableValues) desc += ` options: ${f.availableValues.join(', ')}`;
    if (f.sampleOptions) desc += ` sample options: ${f.sampleOptions}`;
    return desc;
  }).join('\n');
}

// ========================================
// PROMPT GENERATION
// ========================================

/**
 * Generate initial fill prompt
 * @param {Object} profile
 * @param {string} fieldSummary
 * @returns {string}
 */
function generateFillPrompt(profile, fieldSummary) {
  return `You are Form Genie, an on-device AI that fills web forms using user profile data.

Profile JSON:
${JSON.stringify(profile)}

Field Metadata:
${fieldSummary}

Instructions:
- If we don't have relevant profile data for a field, return an empty string for that field. e.g. middle name, credit card info, password, etc.
- Produce the best string value for each field based on profile and metadata.
- MUST match any regex/pattern exactly (transform profile data as needed: remove punctuation, strip country codes, reformat).
- Dates: Convert YYYY-MM-DD to requested format (e.g., MM/DD/YYYY).
- Addresses: Split into street, apt, city, state, zip for separate fields.
- Phones: Follow placeholder/pattern (e.g., (123) 456-7890).

Output: JSON object with exact field names as keys, values as strings (empty if impossible to match pattern).`;
}

/**
 * Generates a precise prompt for an AI to correct invalid fields using profile data.
 *
 * @param {Array<Object>} invalidFields - An array of objects representing invalid fields.
 *   Each object should have `index`, `input` (the DOM element), and `value`.
 * @param {Array<string>} fieldNames - An array of all possible field names, indexed.
 * @param {Object} profile - A key-value object containing the user's complete profile data.
 * @returns {string} A carefully constructed prompt for the AI.
 */
function generateFixPrompt(invalidFields, fieldNames, profile) {
  const fieldsToFix = invalidFields.map(f => fieldNames[f.index]);

  // Describe the fields that need correction and their specific rules.
  const errorDetailLines = invalidFields.map((f, idx) => {
    const input = f.input;
    const name = fieldsToFix[idx];
    
    const constraints = [];
    constraints.push(`type=${input.type || input.tagName.toLowerCase()}`);
    if (input.pattern) constraints.push(`regex=${input.pattern}`);
    if (input.maxLength > 0) constraints.push(`maxlength=${input.maxLength}`);
    if (input.placeholder) constraints.push(`example="${input.placeholder}"`);
    if (input.required) constraints.push('required');
    
    if (input.tagName === 'SELECT') {
      const opts = Array.from(input.options)
        .map(o => (o.value || o.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 8); // Keep the list short for the model
      if (opts.length) {
        constraints.push(`options=[${opts.join('|')}]`);
      }
    }
    
    // CRITICAL CHANGE: Do not include the invalid value. Just state the rules.
    return `- ${name}: (${constraints.join(', ')})`;
  }).join('\n');
  
  const exampleKey = fieldsToFix[0] || 'fieldName';

  // This new prompt template is much more explicit and less ambiguous.
  return `Your task is to correct field values using the provided profile data. For each field listed under "Fields to Correct", generate a new, valid value that satisfies its constraints. Use the "Profile" object as the source of truth. Output JSON only (no prose).

Profile: ${JSON.stringify(profile)}

Fields to Correct:
${errorDetailLines}

Return a JSON object containing only the corrected keys and their new values. Example: {"${exampleKey}":"..."}`;
}

// ========================================
// FORM FILLING LOGIC
// ========================================

/**
 * Parse AI response into field values
 * @param {string} response
 * @param {string[]} fieldNames
 * @returns {string[]}
 */
function parseAIResponse(response, fieldNames) {
  const cleanedResult = extractJSON(response.trim());
  console.log('Cleaned result:', cleanedResult);
  const parsed = JSON.parse(cleanedResult);

  let values;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    values = fieldNames.map(name => {
      const val = parsed[name];
      if (val === undefined || val === null) {
        return '';
      }
      return String(val);
    });
  } else if (Array.isArray(parsed)) {
    values = fieldNames.map((_, idx) => {
      const val = parsed[idx];
      if (val === undefined || val === null) {
        return '';
      }
      return String(val);
    });
  } else {
    throw new Error('AI response must be a JSON object mapping field names to string values.');
  }

  return values;
}

/**
 * Apply values to form fields
 * @param {HTMLElement[]} fields
 * @param {string[]} values
 */
function applyValuesToFields(fields, values) {
  fields.forEach((input, index) => {
    if (values[index] !== undefined) {
      if (input.tagName === 'SELECT') {
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
}

/**
 * Validate fields and collect invalid ones
 * @param {HTMLElement[]} fields
 * @param {string[]} values
 * @param {string[]} fieldNames
 * @returns {Object[]}
 */
function validateFields(fields, values, fieldNames) {
  const invalidFields = [];
  
  fields.forEach((input, index) => {
    // Skip validation for password fields
    if (input.type === 'password') {
      return;
    }
    
    const value = values[index];
    const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

    // Skip if field is optional and empty-like (undefined/null/empty/whitespace)
    if (!input.required && isEmpty) {
      return;
    }

    // Skip fields we intentionally left empty (for required fields we still honor the existing behavior)
    if (typeof value === 'string' && value === '') {
      return;
    }
    
    if (input.checkValidity && !input.checkValidity()) {
      invalidFields.push({
        index: index,
        name: input.name,
        value: values[index],
        pattern: input.pattern,
        validationMessage: input.validationMessage,
        input: input
      });
    }
  });

  return invalidFields;
}

/**
 * Apply fixed values to invalid fields
 * @param {Object[]} invalidFields
 * @param {string[]} fieldNames
 * @param {Object} fixedValues
 */
function applyFixedValues(invalidFields, fieldNames, fixedValues) {
  invalidFields.forEach(field => {
    const key = fieldNames[field.index];
    if (Object.prototype.hasOwnProperty.call(fixedValues, key)) {
      const newValue = fixedValues[key];
      if (newValue !== undefined && newValue !== null) {
        field.input.value = String(newValue);
        console.log(`Fixed ${field.name}: "${field.value}" → "${newValue}"`);
      }
    }
  });
}

/**
 * Fill a group of fields using AI
 * @param {HTMLElement[]} group
 * @param {Object} profile
 */
async function fillGroup(group, profile) {
  // Extract field metadata
  const fieldData = extractFieldMetadata(group);
  const fieldNames = fieldData.map((f, index) => f.name || `field_${index}`);
  const fieldSummary = createFieldSummary(fieldData, fieldNames);

  let fillSession = null;
  let fixSession = null;

  try {
    // Step 1: Initial fill with low temperature for consistency
    fillSession = await createAISession(AI_CONFIG.FILL);
    const fillPrompt = generateFillPrompt(profile, fieldSummary);
    const fillResult = await promptAI(fillSession, fillPrompt, 'Fill');
    
    const values = parseAIResponse(fillResult, fieldNames);

    // Validate expected number of values
    if (values.length !== group.length) {
      console.error(`Expected ${group.length} values but got ${values.length}`);
      console.error('Field names:', group.map(input => input.name || input.id));
      console.error('Values received:', values);
      alert(`Form filling error: Expected ${group.length} values but AI returned ${values.length}. Please check console for details.`);
      return;
    }

    // Apply values to fields
    applyValuesToFields(group, values);

    // Step 2: Validate and fix errors if needed
    const invalidFields = validateFields(group, values, fieldNames);

    if (invalidFields.length > 0) {
      console.log('Validation errors detected:', invalidFields);
      
      // Create new session with higher temperature for fixing
      fixSession = await createAISession(AI_CONFIG.FIX);
      const fixPrompt = generateFixPrompt(invalidFields, fieldNames, profile);
      const fixResult = await promptAI(fixSession, fixPrompt, 'Fix');
      
      const cleanedFix = extractJSON(fixResult.trim());
      const fixedParsed = JSON.parse(cleanedFix);
      
      if (!fixedParsed || typeof fixedParsed !== 'object' || Array.isArray(fixedParsed)) {
        throw new Error('AI fix response must be a JSON object keyed by field names.');
      }
      
      applyFixedValues(invalidFields, fieldNames, fixedParsed);
    }

  } catch (error) {
    console.error('AI error:', error);
    alert('Error using AI: ' + error.message);
  } finally {
    // Clean up sessions
    if (fillSession) {
      fillSession.destroy();
    }
    if (fixSession) {
      fixSession.destroy();
    }
  }
}

// ========================================
// MAIN FORM PROCESSING
// ========================================

/**
 * Fill a form element with AI
 * @param {HTMLFormElement} form
 */
async function fillForm(form) {
  const profile = await getUserProfile();
  if (!profile) return;

  if (!await checkAIAvailability()) return;

  const loading = showLoading();

  try {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    await fillGroup(inputs, profile);
  } finally {
    hideLoading(loading);
  }
}
/**
 * Fill a form element with AI
 * @param {HTMLFormElement} form
 */
async function fillForm(form) {
  const profile = await getUserProfile();
  if (!profile) return;

  if (!await checkAIAvailability()) return;

  const loading = showLoading();

  try {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    await fillGroup(inputs, profile);
  } finally {
    hideLoading(loading);
  }
}

/**
 * Fill a group of inputs (when no form element exists)
 * @param {HTMLElement[]} inputs
 */
async function fillFormInputs(inputs) {
  const profile = await getUserProfile();
  if (!profile) return;

  if (!await checkAIAvailability()) return;

  const loading = showLoading();

  try {
    await fillGroup(inputs, profile);
  } finally {
    hideLoading(loading);
  }
}

/**
 * Fill all forms on the page
 */
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

// ========================================
// MESSAGE LISTENERS
// ========================================

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillAllForms") {
    fillAllForms();
  }
});