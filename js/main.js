// ===== FILE: main.js =====
import * as state from './state.js';
// Import initializers from each component module
import { initializeSidebar } from './components/sidebar.js';
import { initializeChatInput } from './components/chatInput.js';
import { initializeMessageList, showWelcomeInterface } from './components/messageList.js';
import { initializeSettingsModal } from './components/settingsModal.js';
import { initializeWelcomeScreen } from './components/welcomeScreen.js';
import { initializeHeader } from './components/header.js';
import { initializeCreatorScreen } from './customGpt/creatorScreen.js';
import { initializeNotificationSystem } from './notificationHelper.js';

// Import Firebase auth functions
import { initializeFirebase, setupAuthStateListener } from './auth.js';
import * as chatStore from './stores/chatStore.js';
import * as gptStore from './customGpt/gptStore.js';
import * as ui from './components/ui.js';

/**
 * Handle authentication state changes
 * @param {Object} user - Firebase user object
 */
async function handleAuthStateChange(user) {
    if (user) {
        // User is signed in
        try {
            // Update state
            state.setCurrentUser(user);
            state.setIsAuthenticated(true);

            // Load user data
            await state.loadSettings(user.uid);
            const chats = await chatStore.getChatList(user.uid);
            const gpts = await gptStore.getConfigList(user.uid);

            // Update UI
            ui.renderChatList(chats);
            ui.renderCustomGptList(gpts);
            ui.updateAuthUI(user);
            ui.showLoggedInView();
            ui.enableChatFeatures();
        } catch (error) {
            console.error("Error handling sign-in:", error);
            // Show error notification
            window.showNotification("Error loading user data. Please try again.", "error");
        }
    } else {
        // User is signed out
        // Update state
        state.setCurrentUser(null);
        state.setIsAuthenticated(false);
        state.clearSensitiveData();

        // Update UI
        ui.clearChatList();
        ui.clearGptList();
        ui.updateAuthUI(null);
        ui.showLoggedOutView();
        ui.disableChatFeatures();
        showWelcomeInterface();
    }
}

/**
 * Main application entry point.
 * Initializes state, components, and sets the initial UI view.
 */
function initializeApp() {
    console.log("Initializing App...");
    
    // Initialize Firebase first
    const { auth, db } = initializeFirebase();
    
    // Make db instance available to stores
    chatStore.setDbInstance(db);
    gptStore.setDbInstance(db);
    
    // Initialize notification system first so it's available to other components
    initializeNotificationSystem();

    // Set up auth state listener
    setupAuthStateListener(handleAuthStateChange);

    // Initialize Core Components
    initializeSidebar();
    initializeChatInput();
    initializeMessageList();
    initializeSettingsModal();
    initializeWelcomeScreen();
    initializeHeader();
    initializeCreatorScreen();

    // Initial UI state will be handled by auth state listener
}

// Call init when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);