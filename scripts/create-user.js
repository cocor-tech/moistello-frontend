const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TOKENS_FILE = path.join(__dirname, "..", "content", "setup-tokens.json");
const USERS_FILE = path.join(__dirname, "..", "content", "users.json");

// Ensure content dir exists
const contentDir = path.join(__dirname, "..", "content");
if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

// Generate token
const token = crypto.randomBytes(32).toString("hex");
const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

// Load existing tokens
let tokens = [];
if (fs.existsSync(TOKENS_FILE)) {
  tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
}

// Add new token
tokens.push({ token, expiresAt, used: false, createdAt: new Date().toISOString() });

// Clean expired tokens
tokens = tokens.filter((t) => t.expiresAt > Date.now());

fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));

const SETUP_URL = `http://localhost:1110/setup?token=${token}`;
const EXTERNAL_URL = `http://82.24.19.118:1110/setup?token=${token}`;

process.stdout.write(`
╔══════════════════════════════════════════════╗
║         Moistello — Create New Admin         ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Token: ${token.slice(0, 16)}...
║                                              ║
║  Setup URL (local):  ${SETUP_URL}
║                                              ║
║  Setup URL (external): ${EXTERNAL_URL}
║                                              ║
║  Expires in 24 hours                         ║
║  Share this link with the user               ║
║  They will set their username & password     ║
╚══════════════════════════════════════════════╝
`)
