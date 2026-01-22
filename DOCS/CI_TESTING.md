# CI and testing guide

This guide outlines the baseline CI/test expectations for the project and a recommended set of
commands to keep builds predictable.

## Goals
- Provide a consistent, repeatable test/lint workflow.
- Keep CI output deterministic for quick troubleshooting.
- Encourage periodic bundle size checks and telemetry export validation.

## Baseline commands
Run these locally before pushing changes:
```bash
pnpm install
pnpm lint
pnpm test
pnpm build:web
pnpm check:bundle
```

## Suggested CI stages
1. **Install & cache**
   - Restore pnpm store cache.
   - `pnpm install --frozen-lockfile`
2. **Lint**
   - `pnpm lint`
3. **Unit tests**
   - `pnpm test`
4. **Build & bundle checks**
   - `pnpm build:web`
   - `pnpm check:bundle`
5. **Optional telemetry smoke**
   - `pnpm cli:telemetry -- <pack.json> --json --non-interactive --preview-count=4`

## Environment tips
- Ensure Node.js 18.19+ and pnpm 9.4.0 (see `DOCS/CLI_ONBOARDING.md`).
- Use the environment bootstrap script in `DOCS/ENV_SETUP.md` for system tooling.
- For Firebase Test Lab, enable the API and wire service account credentials in CI.
