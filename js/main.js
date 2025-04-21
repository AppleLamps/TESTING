// ===== FILE: main.js =====
import * as auth from './auth.js';
import * as state from './state.js';
import * as ui from './ui.js';
import * as chatStore from './stores/chatStore.js';
import * as gptStore from './customGpt/gptStore.js';
import { setupAuthStateListener } from './auth.js';
import { initializeNotificationSystem } from './helpers/notificationHelper.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeChatInput } from './components/chatInput.js';
import { initializeSettingsModal } from './components/settingsModal.js';
import { initializeHeader } from './components/header.js';
import { initializeCreatorScreen } from './components/creatorScreen.js';
import { initializeWelcomeScreen } from './components/welcomeScreen.js';
import { initializeGlobalEvents } from './events.js';

/**
 * Handles what happens when the user's authentication state changes
 * @param {Object|null} user - Firebase user object
 */
async function handleAuthStateChange(user) {
    const db = window.firebaseDB;

    if (user) {
        try {
            state.setCurrentUser(user);
            state.setIsAuthenticated(true);

            await state.loadSettings(user, db);
            const chats = await chatStore.getChatList(user.uid);
            const gpts = await gptStore.getConfigList(user.uid);

            ui.renderChatList(chats);
            ui.renderCustomGptList(gpts);
            ui.updateAuthUI(user);
            ui.showLoggedInView();
            ui.enableChatFeatures();
        } catch (error) {
            console.error("Error handling sign-in:", error);
            window.showNotification("Error loading user data. Please try again.", "error");
        }
    } else {
        state.setCurrentUser(null);
        state.setIsAuthenticated(false);
        state.clearSensitiveData();

        ui.clearChatList();
        ui.clearGptList();
        ui.updateAuthUI(null);
        ui.showLoggedOutView();
        ui.disableChatFeatures();
        showWelcomeInterface();
    }
}

/**
 * Renders the welcome interface
 */
function showWelcomeInterface() {
    const hasVisited = state.getHasVisited();

    if (!hasVisited) {
        state.setHasVisited(true);
        ui.showWelcomeScreen();
    } else {
        ui.showDefaultScreen();
    }
}

/**
 * Initializes the app
 */
async function initializeApp() {
    console.log("Initializing App...");
    initializeNotificationSystem();
    auth.initializeFirebase();

    initializeSidebar();
    initializeChatInput();
    initializeSettingsModal();
    initializeHeader();
    initializeCreatorScreen();
    initializeWelcomeScreen();
    initializeGlobalEvents();

    setupAuthStateListener(handleAuthStateChange);
}

// Start the app
initializeApp();
