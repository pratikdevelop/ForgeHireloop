# Deploying ForgeHireloop to Firebase Hosting (Option B)

Everything in the codebase is fully built, configured, and ready to deploy to your Firebase project (`forgehireloop`).

---

### Step 1: Install Firebase CLI (if not already installed)
In your local computer's terminal:
```bash
npm install -g firebase-tools
```

---

### Step 2: Log In to Firebase
Log into the Google account that owns or has access to the `forgehireloop` Firebase project:
```bash
firebase login
```

---

### Step 3: Verify the Firebase Project
Confirm that your CLI is targeting `forgehireloop`:
```bash
firebase projects:list
firebase use forgehireloop
```

---

### Step 4: Build & Deploy
Inside this project directory, run:
```bash
# 1. Build the production client bundle
npm run build

# 2. Deploy to Firebase Hosting & Firestore rules
firebase deploy --only hosting,firestore:rules
```

---

### Verification
Once deployed, your application will be live at:
- **Primary Hosting Domain:** https://forgehireloop.web.app
- **Custom Firebase Domain:** https://forgehireloop.firebaseapp.com

---

### Key Pre-Configured Files in this Repo:
- `firebase.json`: Configured with SPA rewrites (`**` -> `/index.html`) so refreshing on `/jobs/:id` or `/companies` works seamlessly.
- `.firebaserc`: Bound to `default: "forgehireloop"`.
- `firestore.rules`: Role-based security rules (candidates, employers, and admin `deepashsharma19@gmail.com`).
- `.env` & `.env.local`: Real `forgehireloop` production credentials.
