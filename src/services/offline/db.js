// LokiJS database setup for offline storage
// Uses localStorage adapter for Cordova WebView
import loki from 'lokijs';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = new loki('ticktrax_offline.db', {
    autoload: true,
    autoloadCallback: () => {
      // Ensure collections exist
      const cols = ['time_entries', 'time_status', 'meta'];
      cols.forEach((name) => {
        if (!dbInstance.getCollection(name)) {
          dbInstance.addCollection(name, { unique: ['id'], indices: ['id'] });
        }
      });
    },
    autosave: true,
    autosaveInterval: 5000,
    persistenceMethod: 'localStorage',
  });

  return dbInstance;
}

export function getCollection(name) {
  const db = getDb();
  let col = db.getCollection(name);
  if (!col) {
    col = db.addCollection(name, { unique: ['id'], indices: ['id'] });
  }
  return col;
}

export function saveDb() {
  try {
    const db = getDb();
    db.saveDatabase();
  } catch (_) {}
}
