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
      addFillButton(form);
    }
  });
}

// Add fill button near the form
function addFillButton(form) {
  const button = document.createElement('button');
  button.textContent = '✨ Fill with Form Genie';
  button.id = 'form-genie-button';
  button.style.cssText = `
    position: absolute;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transition: all 0.2s ease;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  // Add hover effects
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
  };

  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
  };

  button.onmousedown = () => {
    button.style.transform = 'translateY(0)';
  };

  // Position near form
  const rect = form.getBoundingClientRect();
  button.style.top = `${rect.top - 60}px`;
  button.style.left = `${rect.left}px`;
  document.body.appendChild(button);

  button.addEventListener('click', () => fillForm(form));
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
  const groups = groupFields(inputs);

  for (const group of groups) {
    await fillGroup(group, profile);
  }

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
    placeholder: input.placeholder,
    name: input.name,
    type: input.type || input.tagName.toLowerCase(),
    ...(input.tagName === 'SELECT' && {
      options: Array.from(input.options).map(option => ({
        value: option.value,
        text: option.textContent.trim()
      }))
    })
  }));

  const prompt = `Profile: ${JSON.stringify(profile)}. Fields to fill: ${JSON.stringify(fieldData)}. Determine the values to fill in each field based on the profile. If fields are related (like parts of a phone number), split the value accordingly. If the fields appear to be for last name and first name (based on field names containing 'lastname', 'firstname', or labels indicating name parts), split the full name from the profile into appropriate parts. For fields that seem to require katakana (based on patterns or placeholders like 'ヤマダ'), convert the name to katakana. Respond with only a valid JSON array of strings, one for each field in the same order. For select fields, choose the most appropriate option from the provided options list based on the profile data. For select fields, use the value of the selected option. Use empty strings for fields that shouldn't be filled. Do not include any other text, explanations, or formatting.`;

  try {
    const session = await LanguageModel.create({
        temperature: 1,
        topK: 3,
    });
    const result = await session.prompt(prompt);
    console.log('AI prompt:', prompt);
    console.log('AI result:', result);
    const cleanedResult = extractJSON(result.trim());
    console.log('Cleaned result:', cleanedResult);
    const values = JSON.parse(cleanedResult);

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