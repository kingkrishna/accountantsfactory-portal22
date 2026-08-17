/**
 * Reset admin password (MongoDB)
 * Usage: node scripts/resetAdminPassword.js <email> <new-password>
 * Example: node scripts/resetAdminPassword.js admin@accountantsfactory.com Admin@Secure123
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
require('dotenv').config();

async function resetPassword() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node resetAdminPassword.js <email> <new-password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI ||
    `mongodb://${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'accountantsfactory_portal'}`;

  try {
    await mongoose.connect(MONGODB_URI);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.error('Error: No user found with email:', email);
      process.exit(1);
    }

    user.password_hash = await bcrypt.hash(password, 10);
    await user.save();
    console.log('✅ Password reset successfully for', normalizedEmail);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
