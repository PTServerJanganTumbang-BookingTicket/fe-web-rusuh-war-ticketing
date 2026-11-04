# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Form Validation Feedback
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases where `isBookingFormValid()` returns false but `submit.disabled` is false
  - Test that `toBookingViewProps()` returns `submit.disabled === true` when form is invalid
  - Bug Condition from design: `isBugCondition(input) WHERE input.action == "submit" AND NOT isBookingFormValid(form, slotKeys)`
  - Test cases to include:
    - Form with invalid NIK format (not 16 digits) → expect `submit.disabled === true`
    - Form with empty `buyerName` → expect `submit.disabled === true`
    - Form with invalid email format → expect `submit.disabled === true`
    - Form with duplicate NIK across slots → expect `submit.disabled === true`
    - Form with rejected NIK (Dukcapil status !== "valid") → expect `submit.disabled === true`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists where `submit.disabled` is `false` even when form is invalid)
  - Document counterexamples found (e.g., "submit.disabled is false even with invalid NIK")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Form Submit Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (valid form submissions)
  - Preservation Requirements from design:
    - WHEN semua field valid THEN `submit.disabled === false` (when count > 0, remainingMs > 0, submitting === false)
    - WHEN countdown timer habis (remainingMs <= 0) THEN `submit.disabled === true`
    - WHEN tidak ada tiket dipilih (count === 0) THEN `submit.disabled === true`
    - WHEN proses submit sedang berjalan (submitting === true) THEN `submit.disabled === true`
    - WHEN NIK valid dan terverifikasi Dukcapil THEN tampilkan success message
    - WHEN NIK ditolak Dukcapil THEN tampilkan error sesuai status
  - Write property-based tests capturing observed behavior patterns
  - Test cases to include:
    - Valid form with all fields correct → expect `submit.disabled === false`
    - Valid form with `remainingMs <= 0` → expect `submit.disabled === true`
    - Valid form with `count === 0` → expect `submit.disabled === true`
    - Valid form with `submitting === true` → expect `submit.disabled === true`
  - Property: for all form states where `isBookingFormValid() === true AND count > 0 AND remainingMs > 0 AND !submitting`, then `submit.disabled === false`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for Payment Redirect Bug - Form validation not reflected in button disabled state

  - [x] 3.1 Implement the fix in `booking.mapper.ts`
    - Modify `submit.disabled` property in `toBookingViewProps` function
    - Current code (line ~207):
      ```typescript
      disabled: count === 0 || remainingMs <= 0 || input.submitting,
      ```
    - Change to:
      ```typescript
      disabled: count === 0 || remainingMs <= 0 || input.submitting || !isBookingFormValid(form, slots.map(s => s.key)),
      ```
    - This ensures button is disabled when form is invalid
    - _Bug_Condition: `isBugCondition(input) WHERE NOT isBookingFormValid(form, slotKeys)` - form is invalid but button enabled_
    - _Expected_Behavior: `submit.disabled === true` when `isBookingFormValid()` returns false_
    - _Preservation: All existing disabled conditions (count === 0, remainingMs <= 0, submitting === true) must remain_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Form Validation Feedback
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - `submit.disabled === true` when form invalid)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Form Submit Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite for booking module: `npm run test -- src/modules/booking`
  - Ensure all bug condition tests pass (Property 1)
  - Ensure all preservation tests pass (Property 2)
  - Ensure no regressions in other booking module tests
  - Ask the user if questions arise
