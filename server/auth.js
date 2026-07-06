// Simple, dependency-free username/password auth with in-memory sessions.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

fs.mkdirSync(DATA_DIR, { recursive: true });

const sessions = new Map(); // token -> { username, expires }

function readUsers() {
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
  fs.renameSync(tmp, USERS_FILE);
}

function hasUsers() {
  return readUsers().length > 0;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64);
}

function createUser(username, password) {
  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt).toString('hex');
  const user = { id: crypto.randomUUID(), username, salt, hash, createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);
  return { username: user.username };
}

function verifyUser(username, password) {
  const users = readUsers();
  const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user) return null;
  const candidate = hashPassword(password, user.salt);
  const stored = Buffer.from(user.hash, 'hex');
  if (candidate.length !== stored.length || !crypto.timingSafeEqual(candidate, stored)) return null;
  return { username: user.username };
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, expires: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s;
}

function destroySession(token) {
  sessions.delete(token);
}

module.exports = { hasUsers, createUser, verifyUser, createSession, getSession, destroySession, SESSION_TTL_MS };
