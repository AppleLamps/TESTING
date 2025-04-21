// ===== FILE: state.js =====
let currentUser = null;
let isAuthenticated = false;
let hasVisited = false;

// Default settings structure
let settings = {
    apiKey: '',
    geminiApiKey: '',
    xaiApiKey: '',
    model: 'gpt-4',
    ttsInstructions: ''
};

/**
 * Loads the user's settings from Firestore
 * @param {Object} user - Firebase user object
 * @param {Object} db - Firestore instance
 * @returns {Object} settings
 */
export async function loadSettings(user, db) {
    if (!user?.uid || !db) {
        throw new Error('User and database instance are required to load settings');
    }

    try {
        const docRef = db
            .collection('users')
            .doc(user.uid)
            .collection('settings')
            .doc('userSettings');

        const settingsDoc = await docRef.get();

        if (settingsDoc.exists) {
            settings = settingsDoc.data();
        } else {
            await docRef.set(settings); // save defaults
        }

        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        throw error;
    }
}

/**
 * Saves the current settings or a provided one to Firestore
 * @param {Object} user - Firebase user object
 * @param {Object} db - Firestore instance
 * @param {Object} [newSettings] - Optional new settings to save
 */
export async function saveSettings(user, db, newSettings = settings) {
    if (!user?.uid || !db) {
        throw new Error('User and database instance are required to save settings');
    }

    try {
        await db
            .collection('users')
            .doc(user.uid)
            .collection('settings')
            .doc('userSettings')
            .set(newSettings);

        settings = newSettings;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

/**
 * Updates the settings with a partial object and saves to Firestore
 * @param {Object} user - Firebase user object
 * @param {Object} db - Firestore instance
 * @param {Object} updates - Partial settings object
 */
export async function updateSettings(user, db, updates) {
    if (!isAuthenticated) {
        throw new Error('Must be authenticated to update settings');
    }

    const newSettings = { ...settings, ...updates };
    await saveSettings(user, db, newSettings);
    return newSettings;
}

// === App State Accessors ===

export function getSettings() {
    return settings;
}

export function setSettings(newSettings) {
    settings = newSettings;
}

export function getCurrentUser() {
    return currentUser;
}

export function setCurrentUser(user) {
    currentUser = user;
}

export function getIsAuthenticated() {
    return isAuthenticated;
}

export function setIsAuthenticated(authStatus) {
    isAuthenticated = authStatus;
}

export function getHasVisited() {
    return hasVisited;
}

export function setHasVisited(value) {
    hasVisited = value;
}

export function clearSensitiveData() {
    settings = {
        apiKey: '',
        geminiApiKey: '',
        xaiApiKey: '',
        model: 'gpt-4',
        ttsInstructions: ''
    };
    currentUser = null;
    isAuthenticated = false;
}
