// popup.js - Form Genie Popup Script

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
});

async function saveProfile(event) {
  event.preventDefault();
  const fullName = document.getElementById('full-name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const birthDate = document.getElementById('birth-date').value;

  const profile = { fullName, email, phone, address, birthDate };

  await chrome.storage.local.set({ profile });

  // Optionally, show a success message or reset form
  alert('Profile saved!');
}

async function loadProfile() {
  const { profile = {} } = await chrome.storage.local.get('profile');
  document.getElementById('full-name').value = profile.fullName || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('address').value = profile.address || '';
  document.getElementById('birth-date').value = profile.birthDate || '';
}