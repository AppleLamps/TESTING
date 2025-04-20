// ===== FILE: chatStore.js =====
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dbInstance = null;

/**
 * Set the Firestore database instance
 * @param {Object} db - Firestore database instance
 */
export function setDbInstance(db) {
    dbInstance = db;
}

/**
 * Get a list of all chats for a user
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @returns {Promise<Array>} Array of chat metadata objects
 */
export async function getChatList(userId, db = dbInstance) {
    if (!userId || !db) {
        throw new Error('User ID and database instance are required');
    }

    try {
        const chatsRef = collection(db, 'users', userId, 'chats');
        const q = query(chatsRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title || 'Untitled Chat',
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            previewText: getPreviewText(doc.data().history)
        }));
    } catch (error) {
        console.error('Error getting chat list:', error);
        throw error;
    }
}

/**
 * Save a chat to Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {Array} history - Chat history array
 * @param {string} [existingChatId] - Optional ID of existing chat to update
 * @param {string} [title] - Optional chat title
 * @returns {Promise<string>} The chat ID
 */
export async function saveChat(userId, db = dbInstance, history, existingChatId = null, title = null) {
    if (!userId || !db || !history) {
        throw new Error('User ID, database instance, and history are required');
    }

    try {
        const chatData = {
            history,
            title: title || generateChatTitle(history),
            timestamp: serverTimestamp(),
            lastModified: serverTimestamp()
        };

        if (existingChatId) {
            // Update existing chat
            const chatRef = doc(db, 'users', userId, 'chats', existingChatId);
            await updateDoc(chatRef, chatData);
            return existingChatId;
        } else {
            // Create new chat
            const chatsRef = collection(db, 'users', userId, 'chats');
            const docRef = await addDoc(chatsRef, chatData);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error saving chat:', error);
        throw error;
    }
}

/**
 * Load a specific chat from Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {string} chatId - The chat ID to load
 * @returns {Promise<Array>} Chat history array
 */
export async function loadChat(userId, db = dbInstance, chatId) {
    if (!userId || !db || !chatId) {
        throw new Error('User ID, database instance, and chat ID are required');
    }

    try {
        const chatRef = doc(db, 'users', userId, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
            throw new Error('Chat not found');
        }

        return chatDoc.data().history;
    } catch (error) {
        console.error('Error loading chat:', error);
        throw error;
    }
}

/**
 * Delete a specific chat from Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {string} chatId - The chat ID to delete
 */
export async function deleteChat(userId, db = dbInstance, chatId) {
    if (!userId || !db || !chatId) {
        throw new Error('User ID, database instance, and chat ID are required');
    }

    try {
        const chatRef = doc(db, 'users', userId, 'chats', chatId);
        await deleteDoc(chatRef);
    } catch (error) {
        console.error('Error deleting chat:', error);
        throw error;
    }
}

/**
 * Delete all chats for a user from Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 */
export async function deleteAllChats(userId, db = dbInstance) {
    if (!userId || !db) {
        throw new Error('User ID and database instance are required');
    }

    try {
        const chatsRef = collection(db, 'users', userId, 'chats');
        const querySnapshot = await getDocs(chatsRef);

        // Use batched writes for better performance
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error('Error deleting all chats:', error);
        throw error;
    }
}

/**
 * Update a chat's title
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {string} chatId - The chat ID to update
 * @param {string} newTitle - The new title
 */
export async function updateChatTitle(userId, db = dbInstance, chatId, newTitle) {
    if (!userId || !db || !chatId || !newTitle) {
        throw new Error('User ID, database instance, chat ID, and new title are required');
    }

    try {
        const chatRef = doc(db, 'users', userId, 'chats', chatId);
        await updateDoc(chatRef, {
            title: newTitle,
            lastModified: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating chat title:', error);
        throw error;
    }
}

// Helper functions

/**
 * Generate a title for a chat based on its history
 * @param {Array} history - Chat history array
 * @returns {string} Generated title
 */
function generateChatTitle(history) {
    if (!history || history.length === 0) {
        return 'New Chat';
    }

    // Find the first user message
    const firstUserMessage = history.find(msg => msg.role === 'user');
    if (!firstUserMessage) {
        return 'New Chat';
    }

    // Take the first few words of the message
    const words = firstUserMessage.content.split(' ').slice(0, 6).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
}

/**
 * Get preview text from chat history
 * @param {Array} history - Chat history array
 * @returns {string} Preview text
 */
function getPreviewText(history) {
    if (!history || history.length === 0) {
        return '';
    }

    // Get the last message
    const lastMessage = history[history.length - 1];
    const content = lastMessage.content;

    // Truncate and clean the content
    return content.length > 100 
        ? content.substring(0, 100) + '...'
        : content;
} 