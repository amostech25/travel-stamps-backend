# Travel Stamps

A community travel guide for travellers of every background. Visitors add places to a shared map. A single admin approves, rejects or removes them.

**Live address:** travelstampsguide.com

---

## What's inside

| Page | What it does |
| --- | --- |
| `/` | Home: hero, full-width interactive map (search, tag filters, verdict key, place cards) and Latest stamps |
| `/add` | The Add a stamp form: country, city, place name, tags (several), verdict, note, map link and an optional name or handle |
| `/add/thanks` | The "Stamp sent for review" confirmation |
| `/admin` | Admin-only: review queue (Approve / Reject), rejected list, and Live on the map (Remove) |
| `/admin/login` | Admin sign-in |
| `/guidelines`, `/privacy` | Community Guidelines and Privacy Notice |

How it's built:

- **Next.js** runs the website and its server code.
- **Supabase** holds the database and the admin login.
- **MapLibre** draws the map, using MapTiler or the free OpenFreeMap style.
- **Cloudflare Turnstile** checks for spam.

How the pieces fit together:

- **Pins come from the map link only.** The server opens the link (Google Maps or Apple Maps, short links included) and reads the coordinates. If it can't find a location, the form asks the visitor for a better link.
- **Security is enforced in the database** (row-level security). Visitors can only read approved stamps. Nobody can write to the database from the browser. Only the account listed in the `admins` table can approve, reject or remove.
- **Spam protection** has three parts: a Turnstile check, a hidden "honeypot" field, and a limit of 5 submissions per person per day. IP addresses are stored only as a scrambled (hashed) value and deleted after 7 days.
- **Demo mode:** without the Supabase keys, the site runs with sample stamps and nothing is saved. This is handy for previewing.

---

## Going live: step by step

You'll need about an hour. Do the steps in order.

### 1. Put the code on GitHub

1. Create a free account at github.com.
2. Create a **new private repository** called `travel-stamps`.
3. Upload the contents of this folder. Either drag and drop it on the repository page ("uploading an existing file"), or use GitHub Desktop.
   - Don't upload `node_modules`, `.next` or any `.env` file.

### 2. Set up the database (Supabase)

1. Create a project at supabase.com. Choose the **London (eu-west-2)** region if it's offered, and save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste in everything from `supabase/schema.sql`, and click **Run**.
3. Go to **Authentication → Sign In / Providers**. Turn **off** "Allow new users to sign up", so only you can have an account.
4. Go to **Authentication → Users → Add user → Create new user**. Enter your email and a strong password, and tick "Auto confirm user".
5. Back in the **SQL Editor**, run the following, replacing the email with yours:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
6. Go to **Project Settings → API** and copy the **Project URL**, the **anon public** key and the **service_role** key. You'll need them in step 5.
   - Keep the service_role key secret. Never share it or put it in the code.
7. Optional: under **Integrations → Cron**, add a daily job that runs `select public.purge_old_data();`. The site also does this every time someone submits.

### 3. Map (MapTiler) — optional

The map works without this, using the free OpenFreeMap style. For MapTiler's styling:

1. Create an account at maptiler.com.
2. Copy your API key from **Account → API keys**.
3. Under the key's settings, restrict it to `travelstampsguide.com` and your Vercel address.

If you skip MapTiler, change the map provider in the privacy notice (`app/privacy/page.tsx`) to OpenFreeMap.

### 4. Spam check (Cloudflare Turnstile)

1. Create a free Cloudflare account.
2. Go to **Turnstile → Add widget**.
3. Add the hostnames `travelstampsguide.com` and your `*.vercel.app` address, and choose **Managed** mode.
4. Copy the **Site key** and the **Secret key**.

### 5. Host it (Vercel)

1. Sign in to vercel.com with GitHub.
2. Click **Add New → Project** and import `travel-stamps`.
3. Before clicking Deploy, open **Environment Variables** and add these:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler key (optional) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key |
| `IP_HASH_SALT` | Any long random string, for example 40 random letters and numbers |
| `NEXT_PUBLIC_SITE_URL` | `https://travelstampsguide.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | The email address shown on the Guidelines and Privacy pages |

4. Click **Deploy**. When it finishes, open the `.vercel.app` address and check the home page loads **without** the "Demo mode" banner.

### 6. Connect the domain

1. In Vercel, go to **Project → Settings → Domains** and add `travelstampsguide.com`.
2. If you bought the domain through Vercel, it connects automatically. Otherwise, add the DNS records Vercel shows at your registrar.
3. It can take up to a few hours to go live.

### 7. Final checks before announcing

- [ ] Submit a test stamp with a real Google Maps share link. It should reach the thank-you page.
- [ ] Sign in at `/admin`, approve the stamp, and check it appears on the map. Then remove it.
- [ ] Fill in `[YOUR NAME OR BUSINESS NAME]` and `[DATE]` in `app/privacy/page.tsx`.
- [ ] Add your first 20–30 stamps. You can add them through the form and approve them yourself.

Any change you push to GitHub redeploys the site automatically.

---

## Running it on a computer (optional, for developers)

```bash
npm install
cp .env.example .env.local   # leave it empty for demo mode
npm run dev                  # http://localhost:3000
npm test                     # map-link parser tests
npm run build                # production build
```

Where to change things:

| What | Where |
| --- | --- |
| Tags and verdicts | `lib/constants.ts` |
| Colours and layout | `app/globals.css` |
| Guidelines and privacy wording | `app/guidelines/page.tsx`, `app/privacy/page.tsx` |
| Daily submission limit | `LIMITS.submissionsPerDay` in `lib/constants.ts` |
