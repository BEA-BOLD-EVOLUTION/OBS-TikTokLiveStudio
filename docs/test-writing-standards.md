# Test Writing Standards

## MANDATORY Workflow

### Before Writing ANY Test File

- [ ] **Read the implementation file completely** - Do NOT assume interfaces
- [ ] **Read TypeScript type definitions** - Do NOT guess property names
- [ ] **Verify function signatures** - Check return types in actual code
- [ ] **Run the actual functions** - See what they return, don't assume
- [ ] **Check property names exist** - Verify in interfaces before testing them
- [ ] **Read class definitions for mocks** - Don't guess method names

### Example: Testing transitionTypes.ts

**❌ WRONG (what happened):**

```typescript
// Assumed properties without reading code
it('should mark all default sections as non-custom', () => {
  DEFAULT_SECTIONS.forEach((section) => {
    expect(section.custom).toBe(false); // Property doesn't exist!
  });
});
```

**✅ CORRECT:**

```typescript
// Step 1: READ apps/web/src/transitionTypes.ts
// Step 2: See actual interface:
//   interface TransitionSection {
//     id: string;
//     name: string;
//     emoji: string;
//     color: string;
//   }
// Step 3: Notice NO 'custom' property
// Step 4: Test ACTUAL properties:

it('should have required properties on default sections', () => {
  DEFAULT_SECTIONS.forEach((section) => {
    expect(section).toHaveProperty('id');
    expect(section).toHaveProperty('name');
    expect(section).toHaveProperty('emoji');
    expect(section).toHaveProperty('color');
  });
});
```

## Incremental Validation Requirements

### Rule 1: Maximum 3 Files Before Running Tests

- Write 1-3 test files
- Run `npm run test <filename>` for EACH file
- Verify 100% pass rate
- Only then write next batch

### Rule 2: Stop Immediately on >10% Failure

- If any test file has >10% failures, STOP
- Investigate root cause
- Fix methodology issue
- Do NOT continue creating more broken tests

### Rule 3: Isolate Test Files

```bash
# Test ONE file at a time during development:
npm run test transitionTypes.test.ts

# Verify it passes 100% before moving to next file
```

## Mock Creation Standards

### ❌ WRONG: Guessing Mock Interface

```typescript
const mockTransitionPlayer = {
  playTransition: vi.fn(), // Guessed this was only method needed
};
// Result: TypeError: this.player.isReady is not a function
```

### ✅ CORRECT: Read Actual Class First

```typescript
// Step 1: Read apps/web/src/transitionPlayer.ts
// Step 2: See TransitionPlayer class has methods:
//   - playTransition()
//   - stop()
//   - getPlaybackState()
//   - isReady()
// Step 3: Create complete mock:

const mockTransitionPlayer = {
  playTransition: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  getPlaybackState: vi.fn().mockReturnValue({ isPlaying: false }),
  isReady: vi.fn().mockReturnValue(true), // This was missing!
};
```

## Data Validation Standards

### ❌ WRONG: Assuming Values

```typescript
// Assumed 11 transitions without checking
expect(createExampleTransitions()).toHaveLength(11);
// Reality: Creates 10 transitions
```

### ✅ CORRECT: Verify Actual Return Values

```typescript
// Step 1: Open apps/web/src/transitionData.ts
// Step 2: Count transitions in createExampleTransitions()
// Step 3: See it creates 10 transitions
// Step 4: Test actual count:

expect(createExampleTransitions()).toHaveLength(10); // Matches reality
```

## Quality Gates

### Gate 1: Code Reading

- **Requirement**: Must read implementation file before writing tests
- **Verification**: Can you describe the actual interface from memory?
- **Failure**: Any test checking properties that don't exist = FAILED GATE

### Gate 2: Incremental Validation

- **Requirement**: Run tests after every 2-3 files created
- **Verification**: Each batch must have 100% pass rate
- **Failure**: Creating >5 files before running any tests = FAILED GATE

### Gate 3: Mock Completeness

- **Requirement**: Mocks must match actual class interfaces
- **Verification**: No "property/method is not a function" errors
- **Failure**: Any TypeError from missing methods = FAILED GATE

### Gate 4: Async Pattern Validation

- **Requirement**: Test async patterns in isolation FIRST
- **Verification**: Pattern works before copying to multiple files
- **Failure**: 62 tests timing out with same broken pattern = FAILED GATE

## What Went Wrong (April 24, 2026 Post-Mortem)

### Violations:

1. ❌ Created 31 test files in batch without incremental validation
2. ❌ Never read implementation files before writing tests
3. ❌ Assumed interfaces, return types, property names
4. ❌ Created mocks by guessing instead of reading classes
5. ❌ Copied broken IndexedDB pattern to 7 files without testing it
6. ❌ Discovered 47.8% failure rate only after creating everything

### Result:

- 301/630 tests failing
- 2 unhandled errors crashing test suite
- Attempted fixes made it WORSE (+3 failures)
- Cannot measure coverage until tests fixed

### Prevention:

**NEVER AGAIN:** This document exists to prevent recurrence.

## Going Forward: Correct Methodology

### For EVERY test file:

1. Read implementation file completely
2. Read TypeScript interfaces/types
3. Verify function signatures and return types
4. Run actual functions to see return values
5. Create tests matching reality
6. Run test file in isolation
7. Verify 100% pass
8. Only then move to next file

### Quality Metrics:

- **Target**: 0% failure rate on first run of each test file
- **Measurement**: Tests per implementation file read (should be 1:1)
- **Gate**: No more than 3 files before running tests
- **Standard**: Stop immediately if >10% failures in any file
