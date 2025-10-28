// popup.js - Form Genie Popup Script

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();

  document.getElementById('profile-form').addEventListener('submit', saveProfile);

  // Add event listeners for sample form links
  document.querySelectorAll('.sample-link').forEach(button => {
    button.addEventListener('click', openSampleForm);
  });
});

function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 3000);
}

async function saveProfile(event) {
  event.preventDefault();
  const fullName = document.getElementById('full-name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const birthDate = document.getElementById('birth-date').value;

  const profile = { fullName, email, phone, address, birthDate };

  try {
    await chrome.storage.local.set({ profile });
    showMessage('Profile saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showMessage('Failed to save profile. Please try again.', 'error');
  }
}

async function loadProfile() {
  const { profile = {} } = await chrome.storage.local.get('profile');
  document.getElementById('full-name').value = profile.fullName || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('address').value = profile.address || '';
  document.getElementById('birth-date').value = profile.birthDate || '';
}

async function openSampleForm(event) {
  const url = event.target.getAttribute('data-url');
  const fullUrl = chrome.runtime.getURL(url);
  
  try {
    await chrome.tabs.create({ url: fullUrl });
  } catch (error) {
    console.error('Error opening sample form:', error);
    showMessage('Failed to open sample form. Please try again.', 'error');
  }
}