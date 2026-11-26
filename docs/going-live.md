# Running Proofline on your own Firebase project

The public portfolio demo needs none of this. These steps switch an instance to real accounts and data.

## 1. Create the Firebase project
1. In the [Firebase console](https://console.firebase.google.com), add a project (Google Analytics is not needed).
2. Open **Authentication**, get started, and enable the **Email/Password** sign-in provider.
3. Open **Firestore Database** and create a database in production mode, in the region closest to the shop.
4. In **Project settings**, add a **Web app** under *Your apps*. Register it and keep the `firebaseConfig` values it shows.
5. In **Project settings → Service accounts**, generate a new private key. This downloads a JSON key. Treat it like a password: keep it out of git (`.gitignore` already blocks the usual names).

## 2. Configure the app
Copy `.env.example` to `.env.local` and fill it in:
- the four `NEXT_PUBLIC_FIREBASE_*` values from step 4,
- `FIREBASE_SERVICE_ACCOUNT`: the whole service account JSON on one line,
- `PROOF_LINK_SECRET`: the output of `openssl rand -base64 48`.

## 3. Deploy the security rules
```bash
npx firebase login
npx firebase use --add          # pick the project
npm run test:rules              # optional: needs Java 21+ for the emulator
npx firebase deploy --only firestore:rules
```

## 4. Load data and add people
```bash
npm run seed:firestore          # the sample shop, so the screens aren't empty
```
Add each person under **Authentication → Users**, then give them a role and a display name:
```bash
npm run set-role -- morgan@yourshop.com manager "Morgan Lee"
npm run set-role -- jordan@yourshop.com designer "Jordan Kim"
```
Roles: `counter`, `designer`, `production`, `manager`. People sign out and back in to pick up a new role.

## 5. Run it
`npm run dev`, then sign in. On Vercel, add the same variables under **Project → Settings → Environment Variables** (mark the two server values as sensitive) and redeploy.

## How a customer approves a proof
A designer sends the proof from the board. On **Proofs**, staff choose **Copy customer link** and send it by text or email. The link works for that proof only, for 14 days, and stops working when a newer proof is sent.
