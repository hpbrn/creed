# Set up Creed Open

Creed Open is a private, single-owner application. It runs anywhere that can host a Node.js application and uses Supabase for its database, Auth, and file storage.

The guided installer is the recommended path. Manual instructions are included for environments where an interactive terminal is unavailable.

## What you need

- Node.js 22 or newer
- npm 10 or newer
- A free or paid Supabase project

The repository includes a pinned Supabase CLI. You do not need to install it globally. No email provider, payment provider, hosted login provider, or Creed-managed AI key is required.

## Guided local setup

Clone Creed and install its dependencies:

```bash
git clone https://github.com/hpbrn/creed.git
cd creed
npm install
```

Create a Supabase project at [database.new](https://database.new). Keep the database password somewhere safe because the Supabase CLI may request it when linking the project.

Run the installer:

```bash
npm run setup
```

The installer:

1. checks Node.js, npm, and the pinned Supabase CLI;
2. collects and validates the site URL and Supabase keys;
3. generates the 8-digit owner code and the encryption secret;
4. creates or safely updates `apps/open/.env.local` with private file permissions after the keys verify;
5. signs into the Supabase CLI when needed;
6. derives and links the project reference;
7. previews the database migrations;
8. asks before applying any database change;
9. verifies the finished installation.

The installer prints the owner code once. It never prints the encryption secret. Existing unrelated environment values and comments are preserved.

When setup succeeds, start Creed:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001), enter the owner code shown by setup, and open the file.

## Check an installation

Run the read-only doctor at any time:

```bash
npm run doctor
```

It checks local requirements, required configuration, Supabase connectivity, and the Creed database version without changing files or database state. The previous command remains available as an alias:

```bash
npm run setup -- --check
```

## Supabase values

Open the Supabase project's **Connect** dialog or **Settings → API Keys** and use:

- Project URL for `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key, beginning with `sb_publishable_`, for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret key, beginning with `sb_secret_`, for `SUPABASE_SECRET_KEY`

The publishable key is included in browser requests and relies on Row Level Security. The secret key has elevated server access and must never be exposed to the browser, committed, shared in an issue, or prefixed with `NEXT_PUBLIC_`.

Creed's migrations enable RLS and install the tables, functions, grants, policies, and storage configuration the application needs.

## Manual setup

Copy the environment template.

macOS and Linux:

```bash
cp apps/open/.env.example apps/open/.env.local
```

Windows:

```bat
copy apps\open\.env.example apps\open\.env.local
```

Generate the 8-digit owner code and the encryption secret:

```bash
node -e "console.log(String(require('node:crypto').randomInt(0, 1e8)).padStart(8, '0'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Set every required value in `apps/open/.env.local`, then restrict the file so only your account can read it.

macOS and Linux:

```bash
chmod 600 apps/open/.env.local
```

Windows Command Prompt:

```bat
icacls apps\open\.env.local /inheritance:r /grant:r %USERNAME%:RW
```

Windows PowerShell:

```powershell
icacls apps\open\.env.local /inheritance:r /grant:r "${env:USERNAME}:RW"
```

Link Supabase and preview the database changes:

```bash
cd apps/open
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
```

Apply the migrations after reviewing the preview:

```bash
npx supabase db push
cd ../..
npm run doctor
```

The project reference is the first part of the project URL. For `https://abcdefgh.supabase.co`, it is `abcdefgh`.

## Deploy to Vercel

Vercel is the recommended way to host Creed. A first deployment works without user-supplied environment values and opens the setup status screen. Add the required values, redeploy, then point a personal subdomain at the project.

1. Fork Creed on GitHub and import the fork into Vercel.
2. Set the Vercel project root directory to `apps/open`.
3. Deploy once and open `/setup` to see the installation status. Vercel supplies the initial site URL automatically.
4. Add the remaining required values from `apps/open/.env.example` to the Production environment. Set `NEXT_PUBLIC_SITE_URL` only when you want to pin a specific HTTPS origin.
5. From a trusted local clone, link the production Supabase project and run `npx supabase db push --dry-run` from `apps/open`. This is the one step that still needs a machine with the repository.
6. Review and apply the migrations with `npx supabase db push`.
7. Redeploy, open `/enter`, and enter the 8-digit owner code.
8. Verify a database save, export, and one agent connection.

Do not place server secrets in variables prefixed with `NEXT_PUBLIC_`. Use separate Supabase projects and secrets for production and development installations that contain real data.

### Personal subdomain

Host Creed at a subdomain of a domain you already use, such as `creed.example.com`. This avoids registering another domain and keeps your personal context close to the rest of your digital presence.

1. Add the subdomain as a custom domain in the Vercel project.
2. Create the CNAME record in your DNS provider using the exact name and target Vercel provides.
3. Set `NEXT_PUBLIC_SITE_URL` to the custom HTTPS origin without a trailing slash, then redeploy.
4. If GitHub version control is enabled, update the GitHub OAuth App callback URL to `https://creed.example.com/auth/github/callback`.

## Other Node.js hosts

Creed's runtime is platform-neutral. A host needs to:

1. install dependencies with `npm install`;
2. build the Open workspace with `npm run build --workspace creed-open`;
3. start it with `npm run start --workspace creed-open`;
4. provide the required environment values;
5. expose the configured `NEXT_PUBLIC_SITE_URL` origin over HTTPS.

The supported v1 deployment guide is Vercel. Railway and Docker presets can be added later without changing the shared application or Supabase database model.

## Owner access

`CREED_OWNER_SECRET` is the 8-digit owner code. Enter it at `/enter` to authorise a browser once. Store it as eight digits with no spaces or hyphens. Creed then stores a signed, HTTP-only owner cookie and a hidden Supabase session in that browser. There is no recurring login screen.

- Use the same owner code to authorise another browser.
- Rotate the code and restart or redeploy to revoke all existing owner cookies.
- Keep the owner code and encryption secret in a password manager.
- Losing the owner code means generating a replacement.
- Losing the encryption secret can make stored integration credentials unreadable.

## Optional GitHub version control

Create a GitHub OAuth App with this callback URL:

```text
https://your-creed.example/auth/github/callback
```

Add `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` to the environment. Leave both blank to run without GitHub. GitHub is a repository connection, not an account or login provider.

## Optional AI features

The editor and agent connections work without an AI key. Analysis, Panel, and Tab use the owner's OpenRouter key. Add it under **Settings → Model usage**. Creed Open never falls back to managed Cloud credits.

## Updates

When Open shows a new-version notice, its action opens the Update Open guide at https://docs.creed.md/#maintenance. The notice checks published stable Open releases, not individual commits. Read the release notes and back up Supabase before updating a local clone:

```bash
git pull --ff-only https://github.com/hpbrn/creed.git main
npm install
cd apps/open
npx supabase db push --dry-run
npx supabase db push
cd ../..
npm run doctor
```

Restart the app after the doctor passes. If a host such as Vercel deploys from GitHub, push the updated branch so the host can deploy it. Never skip a documented breaking or recovery step.

To update a GitHub fork without cloning it, open the fork on GitHub, choose **Sync fork**, then **Update branch**. The equivalent GitHub CLI command is:

```bash
gh repo sync YOUR_USERNAME/creed --source hpbrn/creed --branch main
```

A connected Vercel project deploys after the fork's branch updates. Resolve or rebase fork-only commits instead of forcing the sync.

## Backups and recovery

Back up the Supabase database and storage bucket before a significant update. A Markdown export is portable, but a complete restoration also requires revisions, proposals, settings, tokens, and avatars.

Use `CREED_ENCRYPTION_SECRET_PREVIOUS` only during a planned key rotation. Remove it after stored credentials have been refreshed through normal use.

## Troubleshooting

### The browser says Database needs setup

Run:

```bash
npm run setup
```

The installer will relink the project, preview unapplied migrations, and ask before applying them.

### Supabase linking rejects the password

Use the database password created with the Supabase project, not the account password or API secret key. Reset it from the Supabase database settings if it has been lost.

### The doctor cannot verify Supabase

Confirm the project is active, the URL belongs to that project, and `SUPABASE_SECRET_KEY` is its current server secret. Then run:

```bash
npm run doctor
```

### Setup must run without an interactive terminal

Use the manual setup instructions, provide environment values through the hosting platform, apply migrations from a trusted local or CI environment, and run `npm run doctor` before opening the installation.
