# Release Checklist

Use this checklist before sharing a new version.

## Pre-Flight

- [ ] Pull latest main branch and resolve local conflicts
- [ ] Verify local environment variables are set in backend/.env
- [ ] Ensure PostgreSQL is running and reachable

## Quality Gates

- [ ] Run backend unit tests: npm run test:backend
- [ ] Run backend integration tests: npm run test:integration
- [ ] Confirm CI workflow passes on the target branch

## Functional Smoke

- [ ] Start app with npm run dev
- [ ] Login with demo account
- [ ] Create a job description
- [ ] Upload a resume (.txt or .pdf)
- [ ] Generate a match and verify score/gaps/strengths appear
- [ ] Export match report PDF

## Documentation

- [ ] Update README if setup/commands changed
- [ ] Update API endpoint docs if route behavior changed
- [ ] Add notes for any known limitations/regressions

## Release Output

- [ ] Tag release version
- [ ] Publish release notes (what changed, risk, rollback plan)
- [ ] Notify stakeholders with runbook links
