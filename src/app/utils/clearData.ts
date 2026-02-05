/**
 * Data Migration & Cleanup Utility
 * 
 * Run this in browser console to clear old localStorage data
 * after upgrading to CardEntity system
 */

// Clear all Lexicoin data from localStorage
export function clearAllData() {
    console.log('🧹 Clearing all Lexicoin data...');

    const keys = [
        'canvas-items',           // App.tsx canvas data
        'lexicoin-state',         // StorageManager core state
        'lexicoin-state-backup',  // StorageManager backup
        'lexicoin-state-temp',    // StorageManager temp
    ];

    keys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Removed: ${key}`);
        } else {
            console.log(`⏭️  Not found: ${key}`);
        }
    });

    console.log('✨ Data cleared! Please refresh the page.');
}

// Browser console command (copy and paste this)
export const BROWSER_CONSOLE_COMMAND = `
// Lexicoin Data Cleanup
(function() {
  const keys = ['canvas-items', 'lexicoin-state', 'lexicoin-state-backup', 'lexicoin-state-temp'];
  keys.forEach(k => localStorage.removeItem(k));
  console.log('✨ Cleared:', keys);
  console.log('🔄 Please refresh the page.');
})();
`;

// Quick function - paste this in browser console directly
if (typeof window !== 'undefined') {
    (window as any).clearLexicoinData = clearAllData;
    console.log('📌 Run clearLexicoinData() to clear all data');
}
