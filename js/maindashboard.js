/**
 * Navigation, User Sessions, Auth Verification & Power Toggle
 */
import { 
  authenticateWithGoogle, 
  authenticateWithCredentials, 
  logOutSession 
} from "./firebase-auth.js";

function switchView(viewId) {
  document.querySelectorAll('.view-page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const target = document.getElementById('view-' + viewId);
  if (target) target.classList.add('active');

  const navBtn = document.getElementById('nav-btn-' + viewId);
  if (navBtn) navBtn.classList.add('active');

  if (viewId === 'lab') {
    setTimeout(() => {
      if (typeof onLabViewActivated === 'function') {
        onLabViewActivated();
      }
    }, 60);
  }
}

// Google Sign In with real validity verification
async function signInWithGoogle() {
  const user = await authenticateWithGoogle();
  if (user) {
    completeLogin(user.email);
  }
}

// Form-based Email/Password validation & authorization check
async function handleEmailSignIn(e) {
  e.preventDefault();
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  const user = await authenticateWithCredentials(email, password);
  if (user) {
    completeLogin(user.email);
  }
}

function completeLogin(email) {
  const userBadge = document.getElementById('userBadge');
  const userNameText = document.getElementById('userNameText');
  const avatarInitial = document.getElementById('avatarInitial');

  if (userBadge) userBadge.style.display = 'flex';
  if (userNameText) userNameText.innerText = email;
  if (avatarInitial) avatarInitial.innerText = email.charAt(0).toUpperCase();

  // Save session state locally
  sessionStorage.setItem("kirchhoff_active_user", email);

  switchView('lab');
}

async function signOut() {
  await logOutSession();
  sessionStorage.removeItem("kirchhoff_active_user");
  const userBadge = document.getElementById('userBadge');
  if (userBadge) userBadge.style.display = 'none';
  switchView('home');
}

// Power Button Toggle logic (from learn_2.js)
document.addEventListener("DOMContentLoaded", () => {
  const powerButton = document.getElementById("headerPowerBtn");
  let powerOn = false;
  if (powerButton) {
    powerButton.addEventListener("click", () => {
      powerOn = !powerOn;
      powerButton.textContent = powerOn ? "■ POWER ON" : "■ POWER OFF";
      powerButton.classList.toggle("on", powerOn);
    });
  }

  // Restore active session if valid
  const savedUser = sessionStorage.getItem("kirchhoff_active_user");
  if (savedUser) {
    completeLogin(savedUser);
  }
});

// Expose handlers to global window scope for inline onclick/onsubmit attributes
window.switchView = switchView;
window.signInWithGoogle = signInWithGoogle;
window.handleEmailSignIn = handleEmailSignIn;
window.completeLogin = completeLogin;
window.signOut = signOut;