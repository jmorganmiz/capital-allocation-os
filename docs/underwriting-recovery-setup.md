# Activate frequent underwriting recovery

The GitHub Actions workflow `Underwriting recovery` calls the authenticated production worker every five minutes. The existing daily Vercel cron remains a fallback. GitHub schedules can be delayed and are not a guaranteed real-time queue.

## One-time setup

1. In the Vercel Dealstash project, confirm the production environment has `CRON_SECRET`. If absent, create a strong random value and redeploy. Never paste its value into chat or commit it.
2. In GitHub repository Settings → Secrets and variables → Actions, create repository secret `DEALSTASH_CRON_SECRET` with that same value.
3. In Actions → Underwriting recovery, select Run workflow. Confirm the run succeeds and its summary reports visited runs and processed steps.

The workflow intentionally fails visibly when the secret is absent or the worker reports errors. Repository Actions must be enabled. It has no repository write permissions and prevents overlapping scheduled sweeps.

## Operational checks

- Inspect Actions failures and the in-app underwriting monitor.
- Start a run and close its tab; verify it advances without client calls after a scheduled sweep.
- Track queue age and throughput. The worker handles at most eight runs per sweep; move to a dedicated queue when this cannot keep up.
- Rotate both secret values together and redeploy Vercel after updating its environment.
