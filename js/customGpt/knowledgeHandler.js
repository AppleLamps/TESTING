// ===== FILE: js/customGpt/knowledgeHandler.js =====

import { showNotification } from '../components/notification.js';

// --- Constants ---
// Firebase Storage limits
const MAX_KNOWLEDGE_FILES_PER_CONFIG = 5;
const MAX_KNOWLEDGE_FILE_SIZE_MB = 50; // Firebase Storage allows larger files
const MAX_KNOWLEDGE_FILE_SIZE_BYTES = MAX_KNOWLEDGE_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_KNOWLEDGE_TYPES = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/json'
];

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.doc', '.docx', '.json'];

/**
 * Processes a single uploaded file intended for knowledge storage.
 * Validates and prepares the file for Firebase Storage upload.
 * @param {File} file The file object to process.
 * @returns {Promise<{name: string, type: string, file: File, size: number} | {name: string, error: string}>} 
 */
export async function processKnowledgeFile(file) {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    const fileSize = file.size;
    console.log(`Processing knowledge file: ${fileName}, Type: ${fileType}, Size: ${fileSize}`);

    // --- Validation ---
    const fileExtension = '.' + fileName.split('.').pop();
    const fileTypeAllowed = ALLOWED_KNOWLEDGE_TYPES.includes(fileType) ||
        (fileType === '' && ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext)));

    if (!fileTypeAllowed) {
        const errorMsg = `File type not supported: ${fileType || 'Unknown'}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`;
        console.warn(`Skipping knowledge file: ${fileName} - ${errorMsg}`);
        return { name: fileName, error: errorMsg };
    }

    if (fileSize > MAX_KNOWLEDGE_FILE_SIZE_BYTES) {
        const errorMsg = `Exceeds size limit (${MAX_KNOWLEDGE_FILE_SIZE_MB}MB).`;
        console.warn(`Skipping knowledge file: ${fileName} - ${errorMsg}`);
        return { name: fileName, error: errorMsg };
    }

    try {
        // Return the file object itself for Firebase Storage upload
        return {
            name: fileName,
            type: fileType || `text/${fileExtension.substring(1)}`, // Fallback type for .md files
            file: file, // Original file object for upload
            size: fileSize,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error(`Error processing knowledge file ${fileName}:`, error);
        const errorMsg = error.message || "Failed to process file.";
        return { name: fileName, error: errorMsg };
    }
}

/**
 * Handles the file selection event for knowledge files.
 * @param {Event} event The file input change event.
 * @param {Array} existingFiles The list of knowledge files already associated with the config.
 * @param {function(Array)} onComplete Callback function, receives array of processed file results.
 */
export async function handleKnowledgeUpload(event, existingFiles = [], onComplete) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        return;
    }

    let currentFileCount = existingFiles.length;
    const processingPromises = [];
    let filesSkipped = 0;
    let totalSize = existingFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    console.log(`Handling knowledge upload: ${files.length} selected. Existing: ${currentFileCount}. Max per config: ${MAX_KNOWLEDGE_FILES_PER_CONFIG}.`);

    for (const file of files) {
        if (currentFileCount >= MAX_KNOWLEDGE_FILES_PER_CONFIG) {
            filesSkipped++;
            continue;
        }

        // Check for duplicates
        if (existingFiles.some(f => f.name.toLowerCase() === file.name.toLowerCase())) {
            showNotification(`File "${file.name}" is already added.`, 'warning');
            filesSkipped++;
            continue;
        }

        // Check cumulative size
        if (totalSize + file.size > MAX_KNOWLEDGE_FILE_SIZE_BYTES * MAX_KNOWLEDGE_FILES_PER_CONFIG) {
            showNotification(`Total size of all files cannot exceed ${MAX_KNOWLEDGE_FILE_SIZE_MB * MAX_KNOWLEDGE_FILES_PER_CONFIG}MB.`, 'warning');
            filesSkipped++;
            continue;
        }

        processingPromises.push(processKnowledgeFile(file));
        currentFileCount++;
        totalSize += file.size;
    }

    if (filesSkipped > 0) {
        let message = `${filesSkipped} file(s) were skipped. `;
        if (currentFileCount >= MAX_KNOWLEDGE_FILES_PER_CONFIG) {
            message += `Maximum ${MAX_KNOWLEDGE_FILES_PER_CONFIG} knowledge files allowed.`;
        } else {
            message += `Check console for details (duplicates, type, size).`;
        }
        showNotification(message, 'warning', 5000);
    }

    const results = await Promise.all(processingPromises);

    if (typeof onComplete === 'function') {
        onComplete(results);
    }

    // Clear the input
    if (event.target) {
        event.target.value = '';
    }
}

// Export constants and types
export {
    MAX_KNOWLEDGE_FILES_PER_CONFIG,
    MAX_KNOWLEDGE_FILE_SIZE_MB,
    MAX_KNOWLEDGE_FILE_SIZE_BYTES,
    ALLOWED_KNOWLEDGE_TYPES,
    ALLOWED_EXTENSIONS
};