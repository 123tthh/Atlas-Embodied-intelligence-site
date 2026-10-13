# Embodied Atlas maintenance

Keep updates focused and resumable. Use the existing Sites project and GitHub repository; preserve their audience and schedules.

## Choose the update path

- Weekly discovery that only adds supported papers uses the existing authenticated `/api/updates` writer. It does not require a Site build. Read back the run and catalog. Pages receives the public additions through its existing refresh workflow.
- Curated authors, affiliations, paper corrections, team decisions and UI changes update versioned source. Open the existing Site source with its supported helper before editing. Keep the opening commit as the release base.
- For a named researcher or paper, inspect the primary homepage and relevant original papers first. Reuse current verified records; expand research only to resolve an actual missing fact. Finish related edits together before publishing.

## Prepare once

1. Inspect the current diff and both remote heads. Run `npm run release:plan -- --base <opening-source-commit> --github-head <current-main-sha> --github-tree <current-main-tree-sha>`.
2. Read the returned manifest. Check every changed path, especially new files. Confirm that the GitHub base version of each changed path matches `previousSha`, or already matches the intended new SHA. Reconcile concurrent edits before publishing.
3. Run `npm run release:check`. Successful checks are cached against exact source contents and the Node/platform version. Shared data or unfamiliar code runs the full suite; `--all --no-cache` forces all checks.
4. Do browser QA for changed interaction/layout or a demonstrated rendering issue. A data-only addition does not require repeating every view. Changes to API, authentication or storage also need the relevant local integration tests; the manifest flags these separately.

## Publish and resume

- `npm run release:status` reports remaining uploads, tool-returned receipts and whether the existing Worker build is reusable. After any source change, regenerate the plan and rerun the affected checks.
- Use the supported Sites source helper. When no reusable build exists, pass the standard `build-site.mjs` command followed by `node scripts/release.mjs stamp-build --input <buildInput-from-status>` as ordered commands. This records a build only after it succeeds and its inputs remain unchanged. On an upload/push retry with `reuseWorkerBuild: true`, omit those completed commands.
- Record only IDs, commit SHAs and actual statuses with `npm run release:receipt -- --stage <stage> --id <tool-returned-id> --status <actual-status>`. Stages: `sitesSource`, `sitesVersion`, `sitesDeployment`, `githubCommit`, `githubRef`, `githubPages`. Do not store raw metadata responses or credentials.
- For GitHub, the manifest provides exact blob request files and one bounded tree request. Upload only its missing blobs; validate returned SHAs and record each with `--stage blob --sha <returned-sha>`. Small contents are batched into the tree; larger/binary files use ordinary Git blob references. Never regenerate large JSON in model memory or depend on a previous task's in-memory strings.
- Fetch the resulting complete recursive tree into an ignored local file and run `npm run release:verify-tree -- --file <file>`. Only then create one commit and update `main` with the captured expected SHA and `force: false`. A rejected lease requires reading the new head and reconciling changes, not a force push.
- Source and UI releases normally publish both Sites and Pages. A Pages build is run once by CI; do not duplicate it locally after equivalent checks unless debugging a Pages-specific failure. Backend-dependent UI waits for the corresponding cloud deployment.
- Retry only the failed stage. For transient network/5xx failures, make at most two additional attempts with backoff; inspect the stored version/deployment/ref before retrying an uncertain mutation. Do not recreate a Site, version, commit or publication merely because its response was interrupted. Preserve the exact archive while its save is pending.
- An authorization/approval rejection is not a transient network error. Follow its stated reason; do not split, encode or reroute a rejected action to evade review. Report any remaining blocker accurately.
- Stop when the deployment and Pages run succeed. One targeted public check is sufficient; do not repeat complete builds, all-view browser tests or unchanged status polls.

The `.release-state/` directory is ignored local working data, not an application feature. Keep credentials only in memory and hidden stdin as required by Sites. Use `docs/UPDATE_WORKFLOW.md` for commands and recovery examples.
