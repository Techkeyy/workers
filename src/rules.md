# Rules for translating a Playwright test into a Kane `_test.md`

Kane is an AI browser agent. It reads plain-English steps, drives a real browser, and checks what a person would see on the page. It has no access to selectors, test-ids, locators, localStorage or the DOM API.

## File format

- Start with YAML frontmatter, exactly these keys: `mode: testing`, `url: <app url>`, `headless: true`, `max_steps: 15`.
- Then a single `# Title` line (the Playwright test title, in plain English).
- Then 2 to 4 `## Step name` headings. Each step has a short plain-English body. Keep the step count small: every step is authored and replayed separately.
- Use the frontmatter `url` instead of `page.goto('/')`. Do not write a navigate step for it. The first step starts on that page.

## Rules

1. **Every `expect` becomes an explicit `Verify` line.** One `Verify ...` line per assertion, in the order the test makes them. Never drop an assertion and never merge several into a vague "check everything looks right". When the same fact about the same element is asserted several ways (for example `toHaveText`, `toContainText` and a regex on the same counter), output ONE Verify line for it: the strictest. Do not write one Verify line per `expect`.
   Example: `expect(counter).toHaveText('2 items left')`, `expect(counter).toContainText('2')` and `expect(counter).toHaveText(/2 items? left/)` become only `Verify the exact visible text of the todo counter is "2 items left"`.
2. **Exact text means exact text.** When Playwright checks full text (`toHaveText('3 items left')`), write `Verify the exact visible text of the todo counter is "3 items left"`. Kane tends to read only part of a label (for example only the number), so the wording "exact visible text of X is ..." is needed. Include the whole string, with singular or plural exactly as asserted.
3. **Lists.** When Playwright checks a list of items (`toHaveText([...])`), write `Verify the list shows exactly these items, in this order: "a", "b", "c"`.
4. **localStorage cannot be read by Kane.** Replace any localStorage check (`waitForFunction` on localStorage, helper functions like `checkNumberOfTodosInLocalStorage`) with visible persistence: reload the page, then verify what is still shown. If the test has no reload, add one only where a localStorage check was made, and verify the same visible items afterwards.
5. **Inline helpers.** Helper functions (`createDefaultTodos`, `beforeEach` hooks) are written out as plain steps with their concrete values, for example the three todo titles typed one by one. Resolve constants (like `TODO_ITEMS`) to their literal strings.
   Page-object methods and fixtures (shown under "Imported local files") are expanded the same way, into the concrete steps and values they perform. A `loggedInPage` fixture becomes the login steps with the literal credentials; `cartPage.applyCoupon('INK10')` becomes typing "INK10" into the coupon box and clicking its button. Assertions inside page-object methods count as `Verify` lines too.
6. **Describe what a user does and sees**, not how Playwright finds it. No CSS selectors, no `data-testid` names, no `getByRole` syntax. Refer to things by their visible label or role in words ("the 'What needs to be done?' box", "the 'Clear completed' button", "the todo counter in the footer").
7. **States that Playwright checks through classes or attributes** (`toHaveClass('completed')`, `toBeChecked`) should be stated as what a user can see: "is shown as completed (checked and struck through)", "the checkbox is checked".
8. **Keep the original intent.** Do not add checks the test did not make, and do not remove any. Do not weaken exact values.

9. **Setup files.** If "Playwright setup files" are included, they run before the test (for example to sign up or log in, saved with `storageState`), so the test itself starts already logged in. Kane starts from a fresh browser, so put those steps at the start of the Kane test as a first `##` step. Write the real flow in plain English. Where the setup uses random data (a generated user), write simple fixed values instead (for example `Ada Lovelace`, `ada@example.test`, a password like `Password123!`, team `Workers`).

## Output

Output ONLY the contents of the `_test.md` file. No explanations before or after, and no surrounding code fences.

## Example

```
---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Counter shows the current number of todo items

## Add the first todo
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Verify the exact visible text of the todo counter is "1 item left".

## Add the second todo
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Verify the exact visible text of the todo counter is "2 items left".
Reload the page. Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat".
```
