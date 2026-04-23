# Contributing to OBS-TikTokLiveStudio

Thank you for contributing to OBS-TikTokLiveStudio! This document provides guidelines and workflows for maintaining code quality.

## Dependency Update Policy

**STANDARD RULE:** Always check for breaking changes before merging any dependency updates.

### Testing Dependency Updates

When Dependabot or team members propose dependency updates, follow this workflow:

#### 1. **Fetch and Test Each PR Individually**

```bash
# Fetch the PR branch
git fetch origin pull/<PR_NUMBER>/head:pr-test-branch

# Checkout the branch
git checkout pr-test-branch

# Install dependencies
npm install

# Run full validation suite
npm run build
npm run lint
npm run format -- --check
npm test
```

#### 2. **Check for Breaking Changes**

**Major Version Bumps** (e.g., 5.x → 6.x):

- Review the package's CHANGELOG or release notes
- Look for migration guides
- Test all affected functionality
- **Required:** Build must pass without errors

**Minor/Patch Updates** (e.g., 3.5.x → 3.8.x):

- Build and lint must pass
- Format check may show style differences (acceptable)
- Review changes if tests fail

#### 3. **Validation Checklist**

Before merging any dependency PR:

- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes with no new errors
- [ ] `npm run format -- --check` runs (formatting differences are OK)
- [ ] `npm test` passes (when tests exist)
- [ ] Manual smoke test if the dependency affects runtime behavior
- [ ] No new security vulnerabilities (`npm audit`)

#### 4. **Special Cases**

**TypeScript Major Updates:**

- Test all workspaces build successfully
- Check for new strict mode errors
- Review breaking changes in [TypeScript release notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html)

**Prettier Updates:**

- Formatting differences are expected and acceptable
- Run `npm run format` after merging to apply new formatting rules
- Review diffs to ensure no unexpected changes

**@types/\* Updates:**

- Major version bumps may indicate underlying package updates
- Check for type compatibility with existing code
- Build errors indicate breaking type changes

### Example: Testing TypeScript 6.0 Update

```bash
# Test PR #7 (TypeScript 5.8.3 → 6.0.3)
git fetch origin pull/7/head:pr-typescript-6
git checkout pr-typescript-6
npm install
npm run build   # ✅ MUST PASS
npm run lint    # ✅ MUST PASS

# If successful, approve and merge
```

## Development Workflow

### Code Quality Standards

- **TypeScript:** Strict mode enabled, all code must be typed
- **Formatting:** Prettier with shared config (`.prettierrc`)
- **Linting:** ESLint 9.x with TypeScript support
- **Testing:** Vitest for unit tests (coverage goals TBD)

### Before Committing

```bash
npm run build    # Verify builds
npm run lint     # Fix lint errors
npm run format   # Auto-format code
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks (dependencies, configs)
- `refactor:` Code refactoring without behavior change
- `test:` Test additions or updates

Examples:

```text
feat: add transition library UI with section navigation
fix: OBS reconnect logic after connection timeout
docs: update README with Phase 1 completion status
chore(deps-dev): bump typescript from 5.8.3 to 6.0.3
```

## Merging Dependabot PRs

### Individual vs. Combined Merges

**Recommended:** Merge dependency PRs individually

- Keeps git history clean
- Easier to identify which update caused issues
- Follows semantic versioning principles

**When to Combine:**

- Multiple patch updates in the same package
- Related packages (e.g., `@types/node` + `node` engine update)
- Emergency security fixes

### Merge Process

1. **Test the PR** (see Testing Dependency Updates above)
2. **Review the PR** - Check Dependabot's release notes and changelog links
3. **Approve** - Add approval comment if all checks pass
4. **Merge** - Use "Squash and merge" to keep history clean
5. **Verify** - Pull latest main and run `npm install && npm run build`

## Validation History

### Recent Dependency Validations

**April 22, 2026:**

- ✅ **TypeScript 6.0.3** (from 5.8.3) - Build passed, no breaking changes detected
- ✅ **Prettier 3.8.3** (from 3.5.3) - Build passed, minor formatting differences expected
- ✅ **@types/node 25.6.0** (from 20.19.39) - Build passed, no type errors

## Questions?

For questions or clarifications, open a discussion in the repository or reach out to the team.
