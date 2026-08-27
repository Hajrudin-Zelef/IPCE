const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'ipce.db');

function initDB() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'commercial' CHECK(role IN ('admin', 'commercial')),
      must_change_password INTEGER DEFAULT 0
    );
  `);

  // Add 2FA columns if they don't exist
  try { db.exec("ALTER TABLE users ADD COLUMN two_factor_secret TEXT"); } catch {}
  try { db.exec("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0"); } catch {}

  // Add collecte detail columns if they don't exist
  try { db.exec("ALTER TABLE collectes ADD COLUMN visites INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE collectes ADD COLUMN contacts INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE collectes ADD COLUMN zone TEXT"); } catch {}
  try { db.exec("ALTER TABLE collectes ADD COLUMN notes TEXT"); } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS collectes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ca REAL DEFAULT 0,
      offres INTEGER DEFAULT 0,
      bc INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      statut TEXT DEFAULT 'brouillon' CHECK(statut IN ('brouillon', 'validee', 'approuvee', 'rejetee')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS rdvs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collecte_id INTEGER NOT NULL,
      prospect TEXT NOT NULL,
      date TEXT NOT NULL,
      montant REAL DEFAULT 0,
      statut TEXT DEFAULT 'Prévu',
      FOREIGN KEY (collecte_id) REFERENCES collectes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS validation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collecte_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collecte_id) REFERENCES collectes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATETIME,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('collecte_pending', 'collecte_approved', 'collecte_rejected', 'reminder', 'system', 'info')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT,
      priority INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      message TEXT NOT NULL,
      model TEXT,
      godmode INTEGER DEFAULT 0,
      response_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conv_created ON ai_conversations(created_at DESC);
  `);

  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('ca_objectif', '100000000');
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('offres_objectif', '6');
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('bc_objectif', '6');
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('rdv_objectif', '6');
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('theme', 'light');
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('notifications_enabled', 'true');

  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) throw new Error('ADMIN_PASSWORD manquant dans .env');
    const hash = bcrypt.hashSync(adminPass, 12);
    db.prepare('INSERT INTO users (nom, password, role, must_change_password) VALUES (?, ?, ?, ?)').run('admin', hash, 'admin', 1);
  }

  const commerciaux = ['Bilé', 'Arthème', 'Catherine'];
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (nom, password, role, must_change_password) VALUES (?, ?, ?, ?)');
  for (const nom of commerciaux) {
    const exists = db.prepare('SELECT id FROM users WHERE nom = ?').get(nom);
    if (exists) continue;
    const tempPass = crypto.randomBytes(9).toString('base64url');
    const hash = bcrypt.hashSync(tempPass, 12);
    insertUser.run(nom, hash, 'commercial', 1);
    console.log(`[INIT] Mot de passe temporaire pour "${nom}": ${tempPass}`);
  }

  return db;
}

module.exports = { initDB, DB_PATH };
