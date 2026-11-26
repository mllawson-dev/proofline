// Gives a staff account its role (a custom claim the security rules read) and its name on the staff list.
// The person must already exist in Firebase Authentication.
// Usage: npm run set-role -- jordan@copperline.example designer "Jordan Kim"
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { isRole } from '../src/lib/firebase/convert';
import { initAdmin } from './admin-init';

const [email, role, ...nameParts] = process.argv.slice(2);
if (!email || !isRole(role) || nameParts.length === 0) {
  console.error('Usage: npm run set-role -- <email> <counter|designer|production|manager> "<Full Name>"');
  process.exit(1);
}
const app = initAdmin();
const user = await getAuth(app).getUserByEmail(email);
await getAuth(app).setCustomUserClaims(user.uid, { role });
await getFirestore(app).collection('staff').doc(user.uid).set({ name: nameParts.join(' '), role });
console.log(`${email} is now ${role}. They need to sign out and back in for it to apply.`);
