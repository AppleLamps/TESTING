// ===== FILE: auth.js =====
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let auth;
let db;

/**
 * Initialize Firebase Auth and Firestore
 */
export function initializeFirebase() {
    auth = getAuth(window.firebaseApp);
    db = getFirestore(window.firebaseApp);
    return { auth, db };
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
}

/**
 * Set up authentication state listener
 * @param {Function} callback - Function to call when auth state changes
 */
export function setupAuthStateListener(callback) {
    return onAuthStateChanged(auth, callback);
}

/**
 * Get the current auth instance
 */
export function getAuthInstance() {
    return auth;
}

/**
 * Get the Firestore database instance
 */
export function getDbInstance() {
    return db;
} 