// ===== FILE: gptStore.js =====
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
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let dbInstance = null;

// Constants
const MAX_FILE_SIZE = 900 * 1024; // 900KB to stay safely under Firestore's 1MB limit
const MAX_FILES_PER_GPT = 5;

/**
 * Set the Firestore database instance
 * @param {Object} db - Firestore database instance
 */
export function setDbInstance(db) {
    dbInstance = db;
}

/**
 * Get a list of all custom GPT configurations for a user
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @returns {Promise<Array>} Array of GPT configuration metadata
 */
export async function getConfigList(userId, db = dbInstance) {
    if (!userId || !db) {
        throw new Error('User ID and database instance are required');
    }

    try {
        const gptsRef = collection(db, 'users', userId, 'customGpts');
        const q = query(gptsRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description,
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            hasKnowledge: (doc.data().knowledgeFiles || []).length > 0
        }));
    } catch (error) {
        console.error('Error getting GPT config list:', error);
        throw error;
    }
}

/**
 * Save a custom GPT configuration to Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {Object} config - The GPT configuration object
 * @param {string} [existingConfigId] - Optional ID of existing config to update
 * @returns {Promise<string>} The configuration ID
 */
export async function saveConfig(userId, db = dbInstance, config, existingConfigId = null) {
    if (!userId || !db || !config) {
        throw new Error('User ID, database instance, and configuration are required');
    }

    // Validate knowledge files
    if (config.knowledgeFiles) {
        if (config.knowledgeFiles.length > MAX_FILES_PER_GPT) {
            throw new Error(`Maximum of ${MAX_FILES_PER_GPT} knowledge files allowed`);
        }

        for (const file of config.knowledgeFiles) {
            if (file.content && file.content.length > MAX_FILE_SIZE) {
                throw new Error(`File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / 1024}KB`);
            }
        }
    }

    try {
        const configData = {
            name: config.name,
            description: config.description || '',
            instructions: config.instructions || '',
            capabilities: config.capabilities || {},
            knowledgeFiles: config.knowledgeFiles || [],
            timestamp: serverTimestamp(),
            lastModified: serverTimestamp()
        };

        if (existingConfigId) {
            // Update existing config
            const configRef = doc(db, 'users', userId, 'customGpts', existingConfigId);
            await updateDoc(configRef, configData);
            return existingConfigId;
        } else {
            // Create new config
            const gptsRef = collection(db, 'users', userId, 'customGpts');
            const docRef = await addDoc(gptsRef, configData);
            return docRef.id;
        }
    } catch (error) {
        console.error('Error saving GPT config:', error);
        throw error;
    }
}

/**
 * Load a specific GPT configuration from Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {string} configId - The configuration ID to load
 * @returns {Promise<Object>} The GPT configuration object
 */
export async function loadConfig(userId, db = dbInstance, configId) {
    if (!userId || !db || !configId) {
        throw new Error('User ID, database instance, and config ID are required');
    }

    try {
        const configRef = doc(db, 'users', userId, 'customGpts', configId);
        const configDoc = await getDoc(configRef);

        if (!configDoc.exists()) {
            throw new Error('Configuration not found');
        }

        const data = configDoc.data();
        return {
            id: configDoc.id,
            name: data.name,
            description: data.description,
            instructions: data.instructions,
            capabilities: data.capabilities,
            knowledgeFiles: data.knowledgeFiles || [],
            timestamp: data.timestamp?.toDate() || new Date(),
            lastModified: data.lastModified?.toDate() || new Date()
        };
    } catch (error) {
        console.error('Error loading GPT config:', error);
        throw error;
    }
}

/**
 * Delete a specific GPT configuration from Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {string} configId - The configuration ID to delete
 */
export async function deleteConfig(userId, db = dbInstance, configId) {
    if (!userId || !db || !configId) {
        throw new Error('User ID, database instance, and config ID are required');
    }

    try {
        const configRef = doc(db, 'users', userId, 'customGpts', configId);
        await deleteDoc(configRef);
    } catch (error) {
        console.error('Error deleting GPT config:', error);
        throw error;
    }
}

/**
 * Delete all GPT configurations for a user from Firestore
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 */
export async function deleteAllConfigs(userId, db = dbInstance) {
    if (!userId || !db) {
        throw new Error('User ID and database instance are required');
    }

    try {
        const gptsRef = collection(db, 'users', userId, 'customGpts');
        const querySnapshot = await getDocs(gptsRef);

        // Use batched writes for better performance
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error('Error deleting all GPT configs:', error);
        throw error;
    }
}

/**
 * Update a GPT configuration's metadata
 * @param {string} userId - The user's ID
 * @param {Object} [db=dbInstance] - Optional Firestore database instance
 * @param {string} configId - The configuration ID to update
 * @param {Object} updates - The fields to update
 */
export async function updateConfigMetadata(userId, db = dbInstance, configId, updates) {
    if (!userId || !db || !configId || !updates) {
        throw new Error('User ID, database instance, config ID, and updates are required');
    }

    try {
        const configRef = doc(db, 'users', userId, 'customGpts', configId);
        await updateDoc(configRef, {
            ...updates,
            lastModified: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating GPT config metadata:', error);
        throw error;
    }
}

/**
 * Validate a knowledge file's content
 * @param {Object} file - The knowledge file object
 * @returns {boolean} Whether the file is valid
 */
export function validateKnowledgeFile(file) {
    if (!file || !file.content) {
        return false;
    }

    // Check file size
    if (file.content.length > MAX_FILE_SIZE) {
        console.error(`File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / 1024}KB`);
        return false;
    }

    return true;
}