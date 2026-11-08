require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDatabase = require('../config/db');
const User = require('../models/User');

async function createCreator() {
  const { CREATOR_NAME, CREATOR_EMAIL, CREATOR_PASSWORD } = process.env;
  if (!CREATOR_NAME || !CREATOR_EMAIL || !CREATOR_PASSWORD) {
    throw new Error('Set CREATOR_NAME, CREATOR_EMAIL, and CREATOR_PASSWORD in backend/.env first.');
  }
  if (CREATOR_PASSWORD.length < 12) {
    throw new Error('CREATOR_PASSWORD must be at least 12 characters.');
  }
  await connectDatabase();
  const email = CREATOR_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(CREATOR_PASSWORD, 12);
  await User.findOneAndUpdate(
    { email },
    { name: CREATOR_NAME.trim(), email, passwordHash },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log(`Creator account ready for ${email}.`);
  process.exitCode = 0;
  await require('mongoose').disconnect();
}

createCreator().catch(async (error) => {
  console.error(error.message);
  process.exitCode = 1;
  await require('mongoose').disconnect();
});
