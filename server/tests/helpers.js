

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const QuranMetadata = require('../models/QuranMetadata');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function disconnect() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clearDatabase() {
  const { collections } = mongoose.connection;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}

async function seedMetadata(count = 30) {
  const docs = [];
  for (let p = 1; p <= count; p++) {
    docs.push({
      pageNumber: p,
      juzNumber: Math.min(30, Math.ceil(p / 21)) || 1,
      surahName: `Surah ${p}`,
      surahNameArabic: '',
      surahs: [{ name: `Surah ${p}`, nameArabic: '' }],
    });
  }
  await QuranMetadata.insertMany(docs);
}

async function createUser(overrides = {}) {
  return User.create({
    name: overrides.name || 'Test User',
    email: overrides.email || `user${Date.now()}${Math.random().toString(16).slice(2)}@example.com`,
    password: overrides.password || 'secret123',
    onboardingComplete: true,
    ...overrides,
  });
}

function tokenFor(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

async function addMemorizedPage(userId, pageNumber, { memorizedDate, lastReviewedDate, reviewCount = 0 }) {
  return UserProgress.create({
    userId,
    pageNumber,
    status: 'memorized',
    memorizedDate,
    lastReviewedDate,
    reviewCount,
  });
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

module.exports = {
  connect,
  disconnect,
  clearDatabase,
  seedMetadata,
  createUser,
  tokenFor,
  addMemorizedPage,
  daysAgo,
};
