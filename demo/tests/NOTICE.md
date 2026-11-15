# Notice

`demo-todo-app.spec.ts` is Playwright's standard example spec, taken from the
`create-playwright` npm package, version 1.17.130
(`assets/demo-todo-app.spec.ts`). Copyright (c) Microsoft Corporation. That
package is licensed under the MIT License. The file itself carries no license
header, so none was removed.

The only change: `page.goto('https://demo.playwright.dev/todomvc')` was replaced
with `page.goto('/')` so it runs against the bundled app via `baseURL`.
Test logic is untouched.
