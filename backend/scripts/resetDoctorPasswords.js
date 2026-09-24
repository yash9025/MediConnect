/**
 * Script: resetDoctorPasswords.js
 * - Resets all doctors' passwords to "12345678"
 * - Sets email to {firstName}@mediconnect.com
 * Run: node --env-file=.env scripts/resetDoctorPasswords.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import doctorModel from '../models/doctorModel.js';

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_PASSWORD = '12345678';

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

async function resetDoctors() {
  await mongoose.connect(`${MONGODB_URI}/MediConnect`);
  console.log('Connected to MongoDB\n');

  const doctors = await doctorModel.find({});
  if (!doctors.length) {
    console.log('No doctors found in the database.');
    await mongoose.disconnect();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

  console.log(`Found ${doctors.length} doctor(s). Resetting...\n`);
  console.log('─'.repeat(60));

  const usedEmails = new Set();

  for (const doctor of doctors) {
    // Strip honorifics like "Dr.", "Dr", "Prof." etc. and pick the first real name word
    const nameParts = doctor.name.trim().split(/\s+/).filter(p => !/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)$/i.test(p));
    let firstName = (nameParts[0] || doctor.name.trim().split(/\s+/)[0]).toLowerCase()
      .replace(/[^a-z0-9]/g, ''); // strip non-alphanumeric

    // Handle duplicate emails by appending last name initial
    let newEmail = `${firstName}@mediconnect.com`;
    if (usedEmails.has(newEmail) && nameParts.length > 1) {
      const lastInitial = nameParts[nameParts.length - 1][0].toLowerCase();
      newEmail = `${firstName}${lastInitial}@mediconnect.com`;
    }
    usedEmails.add(newEmail);


    await doctorModel.findByIdAndUpdate(doctor._id, {
      password: hashedPassword,
      email: newEmail,
      refreshTokens: []   // Invalidate any existing sessions
    });

    console.log(`✓ ${doctor.name}`);
    console.log(`  Old email : ${doctor.email}`);
    console.log(`  New email : ${newEmail}`);
    console.log(`  Password  : ${NEW_PASSWORD}`);
    console.log('─'.repeat(60));
  }

  console.log(`\n✅ Done! ${doctors.length} doctor(s) updated.`);
  await mongoose.disconnect();
}

resetDoctors().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
