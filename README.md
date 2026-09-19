# Reminders

A small personal reminder app: sign up, log in, and manage your own list of
reminders. Plain HTML/CSS/JavaScript in the browser, Supabase for the database
and auth, GitHub Pages for hosting. No build step, no npm install.

```
index.html   app shell: auth form + reminder list UI
style.css    styling
app.js       Supabase client, auth, CRUD, DOM updates
schema.sql   table + Row Level Security policies (run once in Supabase)
```

## How the pieces fit together

The browser talks to Supabase directly — there is no server of your own in the
middle. Supabase gives you a Postgres database with an HTTP API in front of it,
plus an auth service that hands the browser a token after login. `app.js`
attaches that token to every query, and Postgres uses it to decide which rows
you are allowed to touch.

## Setup

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) and create a new project. The
free tier is plenty. Pick a strong database password and save it somewhere,
though this app never uses it directly.

### 2. Run the schema

In the Supabase dashboard, open **SQL Editor**, paste the contents of
`schema.sql`, and run it. That creates the `reminders` table and the Row Level
Security policies.

Check it worked: **Table Editor** should show `reminders`, and **Authentication
→ Policies** should list four policies against it.

### 3. Add your project URL and key

In the dashboard, go to **Project Settings → API** and copy:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

Paste both into the top of `app.js`:

```js
const SUPABASE_URL = "https://abcdefgh.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

### 4. Run it locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

Sign up with an email and password. By default Supabase sends a confirmation
email and you must click the link before your first login. To skip that while
you're experimenting, turn off **Confirm email** under **Authentication →
Sign In / Providers → Email**.

### 5. Deploy to GitHub Pages

Push this repo to GitHub, then in the repo's **Settings → Pages**, set
**Source** to *Deploy from a branch* and pick your branch with folder `/ (root)`.
After a minute the app is live at
`https://<your-username>.github.io/<repo-name>/`.

Finally, tell Supabase about that URL: **Authentication → URL Configuration →
Site URL**. Confirmation and password-reset links point there.

## About that key in the source code

The anon public key is committed to this repo and served to every visitor. That
is how Supabase is designed to work, not an oversight — it identifies your
project, it isn't a password. Anyone viewing source can read it, and that's
fine.

What keeps your data private is Row Level Security. With RLS enabled, every
query Postgres receives is rewritten to add `where user_id = auth.uid()`, where
`auth.uid()` comes from the signed login token, not from anything the browser
claims. Someone holding the anon key but no valid login sees zero rows. Someone
logged in as themselves sees only their own rows, even if they craft requests by
hand with `curl`. That is why the app's queries in `app.js` never filter by user
themselves — the database does it, and the database can't be talked out of it.

Two keys you must **not** put in this file:

- The **service_role** key (same API settings page). It bypasses RLS entirely.
  It belongs only on a server you control.
- Your database password.

And one rule that follows from all this: if you ever add a new table, enable RLS
on it as well. A table without RLS is readable by anyone with the anon key.

## What's not here (yet)

Notifications, recurring reminders, categories/tags, sharing, and payments are
all out of scope for this version.
