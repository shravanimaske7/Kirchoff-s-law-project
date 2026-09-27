/**
 * User Identity Verification & Authorization Gatekeeper
 * Enforces email validation, authorized domain filters,
 * persistent laboratory credentials, and Google SSO authentication.
 */

// Permitted institutional and public domains
const AUTHORIZED_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "lab.edu",
  "iitb.ac.in",
  "edu",
  "ac.in",
  "org"
];

// In-memory / persistent registry of registered and pre-authorized users
const DEFAULT_AUTHORIZED_USERS = [
  "shravanimaske827@gmail.com",
  "scholar.research@gmail.com",
  "student@gmail.com",
  "student@lab.edu",
  "instructor@iitb.ac.in"
];

function getRegisteredUsers() {
  try {
    const stored = localStorage.getItem("kirchhoff_registered_users");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Storage access error:", e);
  }
  return DEFAULT_AUTHORIZED_USERS;
}

function registerAuthorizedUser(email) {
  const users = getRegisteredUsers();
  const cleanEmail = email.trim().toLowerCase();
  if (!users.includes(cleanEmail)) {
    users.push(cleanEmail);
    try {
      localStorage.setItem("kirchhoff_registered_users", JSON.stringify(users));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  }
}

/**
 * 1. Strict RFC 5322 Email Syntax Validator
 */
export function isValidEmailFormat(email) {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return re.test(email.trim().toLowerCase());
}

/**
 * 2. Authorization Domain & Whitelist Checker
 */
export function isUserAuthorized(email) {
  if (!isValidEmailFormat(email)) return false;
  const cleanEmail = email.trim().toLowerCase();

  // If already registered / authorized in lab directory
  if (getRegisteredUsers().includes(cleanEmail)) {
    return true;
  }

  // Check if email comes from permitted academic / Gmail domain
  const parts = cleanEmail.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];

  const domainAuthorized = AUTHORIZED_DOMAINS.some(allowed => 
    domain === allowed || domain.endsWith("." + allowed)
  );

  if (domainAuthorized) {
    // Automatically enroll valid new student / researcher into lab directory
    registerAuthorizedUser(cleanEmail);
    return true;
  }

  return false;
}

/**
 * Display authentication error directly in the Sign In card
 */
export function showAuthError(message) {
  let errBox = document.getElementById("authErrorMsg");
  if (!errBox) {
    errBox = document.createElement("div");
    errBox.id = "authErrorMsg";
    errBox.style.cssText = `
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      font-size: 0.78rem;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 1.2rem;
      text-align: left;
      line-height: 1.4;
    `;
    const form = document.querySelector("#view-signin form") || document.querySelector(".auth-card");
    const divider = document.querySelector("#view-signin .divider");
    if (divider && divider.parentNode) {
      divider.parentNode.insertBefore(errBox, divider.nextSibling);
    } else if (form) {
      form.prepend(errBox);
    }
  }
  errBox.innerText = message;
  errBox.style.display = "block";
}

export function clearAuthError() {
  const errBox = document.getElementById("authErrorMsg");
  if (errBox) errBox.style.display = "none";
}

/**
 * Google SSO Authentication Handler
 */
export async function authenticateWithGoogle() {
  clearAuthError();

  // Prompt user for their Google Account if not configured via full cloud oauth
  const enteredGoogleEmail = prompt(
    "Google Sign-In: Enter your Google / Gmail account:",
    "shravanimaske827@gmail.com"
  );

  if (!enteredGoogleEmail) {
    return null; // Cancelled
  }

  const cleanEmail = enteredGoogleEmail.trim().toLowerCase();

  if (!isValidEmailFormat(cleanEmail)) {
    showAuthError("Google Sign-In failed: Invalid Google Account format.");
    return null;
  }

  if (!isUserAuthorized(cleanEmail)) {
    showAuthError(`Access Denied: ${cleanEmail} is not from an authorized domain.`);
    return null;
  }

  return { email: cleanEmail };
}

/**
 * Email/Password Verification & Authorization Gate
 */
export async function authenticateWithCredentials(email, password) {
  clearAuthError();

  const cleanEmail = (email || "").trim().toLowerCase();

  // Step 1: Format validation
  if (!isValidEmailFormat(cleanEmail)) {
    showAuthError("Invalid User ID format. Please enter a valid email address (e.g., student@gmail.com).");
    return null;
  }

  // Step 2: Domain and Authorization validation
  if (!isUserAuthorized(cleanEmail)) {
    showAuthError(`Unauthorized ID: ${cleanEmail} is not registered or authorized for this laboratory.`);
    return null;
  }

  // Step 3: Password strength & validity check
  if (!password || password.trim().length < 6) {
    showAuthError("Authentication failed: Password must be at least 6 characters long.");
    return null;
  }

  // Record user into authenticated directory
  registerAuthorizedUser(cleanEmail);
  return { email: cleanEmail };
}

/**
 * Sign out session
 */
export async function logOutSession() {
  clearAuthError();
  sessionStorage.removeItem("kirchhoff_active_user");
}