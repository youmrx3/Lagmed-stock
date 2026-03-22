# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Weekly Supabase Backup (Automated)

This repository now includes an automated weekly backup workflow:

- Workflow file: [.github/workflows/weekly-supabase-backup.yml](.github/workflows/weekly-supabase-backup.yml)
- Schedule: every Sunday at 02:00 UTC
- Trigger: scheduled + manual run from GitHub Actions
- Output:
	- Full database dump in PostgreSQL custom format (`.dump`)
	- Schema-only SQL dump (`.sql.gz`)
	- SHA256 checksums (`SHA256SUMS.txt`)

### 1. Configure GitHub Secrets

Go to GitHub repository settings:

- Settings -> Secrets and variables -> Actions -> New repository secret

Required secret:

- `SUPABASE_DB_URL`
	- Use your Supabase Postgres connection string (transaction/session mode) with password.

Optional secrets for off-GitHub storage (recommended):

- `BACKUP_AWS_ACCESS_KEY_ID`
- `BACKUP_AWS_SECRET_ACCESS_KEY`
- `BACKUP_AWS_REGION`
- `BACKUP_S3_BUCKET`

If optional S3 secrets are provided, each weekly backup is also uploaded to your bucket.

### 2. Run backup manually (any time)

1. Open GitHub -> Actions
2. Select "Weekly Supabase Backup"
3. Click "Run workflow"

### 3. Restore from a backup

Restore into a safe target database first (recommended test project):

```bash
pg_restore \
	--clean \
	--if-exists \
	--no-owner \
	--no-privileges \
	--dbname="<TARGET_DATABASE_URL>" \
	supabase-weekly-<id>.dump
```

Verify data after restore:

- Stock tables
- Clients
- Payment tracking
- Storage object links

### 4. Storage files note

Database backups do not include binary files in Supabase Storage buckets (images/documents).
For full disaster recovery, also back up Supabase Storage objects on a schedule.
