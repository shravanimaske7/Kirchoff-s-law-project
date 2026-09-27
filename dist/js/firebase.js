/**
 * Firebase App & Service Mock/Fallback Driver
 * Seamlessly handles live Firebase credentials if provided,
 * while preventing API key invalidation crashes in local environments.
 */

// If you have actual credentials from Firebase Console, put them here.
// Otherwise, the fallback authenticator in firebase-auth.js handles verification.
const firebaseConfig = {
  apiKey: "", 
  authDomain: "kirchhoff-3dlab.firebaseapp.com",
  projectId: "kirchhoff-3dlab",
  storageBucket: "kirchhoff-3dlab.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

const hasValidApiKey = Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("DummyKey"));

export { firebaseConfig, hasValidApiKey };