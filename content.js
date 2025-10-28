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
  const fieldData = group.map(input => {
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
    
    // For select fields, only include a hint about what to choose, not all options
    if (input.tagName === 'SELECT') {
      const optionCount = input.options.length;
      baseData.selectType = `select with ${optionCount} options`;
      // Only include sample of available values
      if (optionCount > 5) {
        baseData.sampleOptions = Array.from(input.options).slice(0, 3).map(opt => opt.value).join(', ') + '...';
      } else {
        baseData.availableValues = Array.from(input.options).map(opt => opt.value);
      }
    }
    
    return baseData;
  });

  const fieldNames = fieldData.map((f, index) => f.name || `field_${index}`);
  const fieldSummary = fieldData.map((f, i) => {
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

  const prompt = `You are Form Genie, an on-device AI that fills web forms using user profile data.

Profile JSON:
${JSON.stringify(profile)}

Field Metadata:
${fieldSummary}

Instructions:
- For each field above, produce the correct string value based on the profile and metadata
- Respect regex patterns (e.g., [A-Za-z]+ means remove apostrophes/hyphens)
- Format phone numbers to match patterns, splitting into parts when multiple phone fields exist
- Format dates to match patterns (convert YYYY-MM-DD as needed)
- Split addresses into street, apartment, city, state, zip when required
- Leave passwords, credit card segments, or unknown fields as empty strings
- Provide a value for every listed field, even if empty

Output:
Return ONLY a JSON object where each key is one of the field names listed above and each value is the string to fill. Example format (keys must match exactly):
{
  "${fieldNames[0]}": "value for ${fieldNames[0]}",
  "${fieldNames[1]}": "value for ${fieldNames[1]}",
  ...
  "${fieldNames[fieldNames.length - 1]}": "value for ${fieldNames[fieldNames.length - 1]}"
}

Do not include any extra commentary or explanations.`;

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

    // Validate that we got the right number of values
    if (values.length !== group.length) {
      console.error(`Expected ${group.length} values but got ${values.length}`);
      console.error('Field names:', group.map(input => input.name || input.id));
      console.error('Values received:', values);
      alert(`Form filling error: Expected ${group.length} values but AI returned ${values.length}. Please check console for details.`);
      session.destroy();
      return;
    }

    // First pass: fill all fields
    group.forEach((input, index) => {
      if (values[index] !== undefined) {
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

    // Second pass: validate and fix any errors
    const invalidFields = [];
    group.forEach((input, index) => {
      // Skip validation for password fields and empty optional fields
      if (input.type === 'password') {
        return; // Don't validate or fix password fields
      }
      
      // Skip if field is optional (not required) and we left it empty
      if (!input.required && values[index] === '') {
        return;
      }
      
      // Skip fields we intentionally left empty (no data in profile)
      if (values[index] === '') {
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

    // If there are validation errors, try to fix them
    if (invalidFields.length > 0) {
      console.log('Validation errors detected:', invalidFields);
      const fieldsToFix = invalidFields.map(field => fieldNames[field.index]);
      const exampleKey = fieldsToFix[0] || 'fieldName';

      const fixPrompt = `Some field values failed validation. Provide corrected values as JSON.

Fields needing correction (use exact field names as keys in your JSON output):
${invalidFields.map((f, idx) => `- ${fieldsToFix[idx]}: "${f.value}" failed pattern ${f.pattern || 'n/a'}
  Error: ${f.validationMessage}`).join('\n')}

Profile data for reference: ${JSON.stringify(profile)}

Return ONLY a JSON object containing corrected values for these fields. Example:
{
  "${exampleKey}": "corrected value"
}

Remember: match regex constraints (e.g., [A-Za-z]+ means letters only).`;

      const fixResult = await session.prompt(fixPrompt);
      console.log('Fix prompt:', fixPrompt);
      console.log('Fix result:', fixResult);
      const fixedParsed = JSON.parse(extractJSON(fixResult.trim()));
      if (!fixedParsed || typeof fixedParsed !== 'object' || Array.isArray(fixedParsed)) {
        throw new Error('AI fix response must be a JSON object keyed by field names.');
      }
      
      // Apply fixes
      invalidFields.forEach(field => {
        const key = fieldNames[field.index];
        if (Object.prototype.hasOwnProperty.call(fixedParsed, key)) {
          const newValue = fixedParsed[key];
          if (newValue !== undefined && newValue !== null) {
            field.input.value = String(newValue);
            console.log(`Fixed ${field.name}: "${field.value}" → "${newValue}"`);
          }
        }
      });
    }

    // Clean up session
    session.destroy();

  } catch (error) {
    console.error('AI error:', error);
    alert('Error using AI: ' + error.message);
  }
}

// Extract JSON from AI response, handling markdown formatting
function extractJSON(text) {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
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