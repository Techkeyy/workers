# Tighten mode (the user passed `--tighten`)

Old suites often check visible text loosely: `toContainText('1')` on a counter, a regex, or `toBeVisible()` on an element whose words matter. A loose check passes even when the words are wrong ("1 items left"). In tighten mode you write the check a person reading the page would make. This relaxes rule 8 in exactly one way:

1. **Loose text checks become exact visible text.** When the test checks a visible label loosely, write `Verify the exact visible text of <the element> is "<full text>"`, with the full text as it should read at that moment of the test, including singular or plural.
2. **Work the exact text out from the test file itself.** Use the test's own steps, plus assertions in other tests of the same file. For example, a sibling test asserting `'3 items left'` gives the label format, so after adding one item the counter reads `"1 item left"`. The whole spec file is included below for this purpose only.
3. **Do not add checks on things the test does not touch.** Tighten what the test already looks at. Never invent new behaviour to check.
4. **Every original assertion is still represented.** Tightening replaces a loose check with a strict one; it never drops one.
5. **If you cannot work out the exact text from the file, keep the original loose check.** Do not guess.
