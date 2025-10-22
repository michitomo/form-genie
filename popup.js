// popup.js - Form Genie Popup Script

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();

  document.getElementById('profile-form').addEventListener('submit', saveProfile);
});

async function saveProfile(event) {
  event.preventDefault();
  const lastName = document.getElementById('last-name').value;
  const firstName = document.getElementById('first-name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const birthDate = document.getElementById('birth-date').value;

  const profile = { lastName, firstName, email, phone, address, birthDate };

  await chrome.storage.local.set({ profile });

  // Optionally, show a success message or reset form
  alert('Profile saved!');
}

async function loadProfile() {
  const { profile = {} } = await chrome.storage.local.get('profile');
  document.getElementById('last-name').value = profile.lastName || '';
  document.getElementById('first-name').value = profile.firstName || '';
  document.getElementById('email').value = profile.email || '';
  document.getElementById('phone').value = profile.phone || '';
  document.getElementById('address').value = profile.address || '';
  document.getElementById('birth-date').value = profile.birthDate || '';
}