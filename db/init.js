const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
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
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass) throw new Error('ADMIN_PASSWORD manquant dans .env');
    const hash = bcrypt.hashSync(adminPass, 12);
    db.prepare('INSERT INTO users (nom, password, role, must_change_password) VALUES (?, ?, ?, ?)').run('admin', hash, 'admin', 1);
  }

  const commerciaux = ['Bilé', 'Arthème', 'Catherine'];
  const defaultPass = process.env.DEFAULT_PASSWORD;
  if (!defaultPass) throw new Error('DEFAULT_PASSWORD manquant dans .env');
  const defaultHash = bcrypt.hashSync(defaultPass, 12);
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (nom, password, role, must_change_password) VALUES (?, ?, ?, ?)');
  for (const nom of commerciaux) {
    insertUser.run(nom, defaultHash, 'commercial', 1);
  }

  return db;
}

module.exports = { initDB, DB_PATH };
