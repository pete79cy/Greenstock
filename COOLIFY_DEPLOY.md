# GreenStockManager deploy σε Coolify

## 1. Ανέβασμα project

Ανέβασε τον φάκελο `GreenStockManager` σε Git repository και σύνδεσέ τον στο Coolify ως Dockerfile application.

Το Dockerfile εκθέτει την πόρτα `5000`.

## 2. Database

Δημιούργησε PostgreSQL database στο Coolify ή χρησιμοποίησε υπάρχουσα PostgreSQL.

Στο application βάλε environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
SESSION_SECRET=put-a-long-random-secret-here
DOCUMENT_ENCRYPTION_KEY=put-a-32-character-secret-here
APP_ORIGIN=https://hr.pakkou.cloud
PORT=5000
NODE_ENV=production
```

Το container τρέχει αυτόματα `npm run db:push` πριν ξεκινήσει, ώστε να δημιουργήσει/ενημερώσει τους πίνακες.

## 3. Persistent storage

Στο Coolify πρόσθεσε persistent volume:

```text
/app/uploads
```

Αυτό κρατάει τα uploaded έγγραφα μετά από restart ή redeploy.

## 4. Coolify settings

Χρήσιμες ρυθμίσεις:

```text
Port: 5000
Healthcheck path: /api/health
Build pack/type: Dockerfile
```

Μετά το πρώτο deploy, δες τα logs. Αν το database URL είναι σωστό, θα δεις ότι εκτελείται το `db:push` και μετά το app ξεκινάει με `serving on port 5000`.

## 5. Σημαντικό για login

Το registration είναι κλειστό μέσα στον κώδικα. Μετά το πρώτο deploy, άνοιξε terminal/execute command στο Coolify container και τρέξε:

```sh
ADMIN_USERNAME=admin ADMIN_PASSWORD='change-this-password' npm run create:admin
```

Το password πρέπει να είναι τουλάχιστον 8 χαρακτήρες. Αν ο χρήστης υπάρχει ήδη, το script δεν τον αλλάζει.

## 6. SSO (Authentik) — auto-login χωρίς δεύτερο password

Το `hr.pakkou.cloud` είναι πίσω από το Authentik forward-auth (host nginx). Όταν οι
παρακάτω μεταβλητές είναι ενεργές, το app διαβάζει την ταυτότητα που περνάει το nginx
και κάνει **αυτόματο login** τον χρήστη (Passport session) — χωρίς τοπικό password:

```env
SSO_FORWARD_AUTH_ENABLED=1
SSO_PROXY_SECRET=<ίδιο με το nginx: /opt/id-panel/.sso-proxy-secret>
```

- Το nginx (`/etc/nginx/sites-available/hr.pakkou.cloud`) προωθεί
  `X-Authentik-Email`, `X-Authentik-Username` και `X-SSO-Proxy-Secret` και τα
  **ξαναγράφει** ώστε ο client να μην μπορεί να τα πλαστογραφήσει.
- Ο server (`server/auth.ts` → `ssoForwardAuth`) εμπιστεύεται τα headers **μόνο**
  αν το `X-SSO-Proxy-Secret` ταιριάζει με το `SSO_PROXY_SECRET` (constant-time).
- Αντιστοίχιση χρήστη: πρώτα με **email** (case-insensitive), μετά με **username**.
  Αν δεν υπάρχει, δημιουργείται αυτόματα νέος χρήστης με ρόλο `user` (τυχαίο password).
  Ο admin πρέπει να έχει `email` = το Authentik email του (π.χ. `panayiotis@pakkoutis.com`).
- Το τοπικό password login (`/api/auth/login`) παραμένει ως fallback.
- Rollback: `SSO_FORWARD_AUTH_ENABLED=0` (redeploy) — το app γυρνάει σε password login.
