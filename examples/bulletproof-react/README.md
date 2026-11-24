# Workers on bulletproof-react

A real open-source app with a Playwright suite written by its maintainers: [alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react), `apps/react-vite`, at commit `9506629`. Its tests log in through a Playwright setup project (`e2e/tests/auth.setup.ts`, saved with `storageState`). The app mocks its API in the browser (MSW), so it needs no backend.

## Reproduce

```bash
git clone https://github.com/alan2207/bulletproof-react
cd bulletproof-react && git checkout 9506629 && cd apps/react-vite
cp .env.example .env
corepack yarn install --frozen-lockfile --ignore-scripts
npx playwright install chromium

# start the app yourself (its webServer runs `yarn dev`, which needs yarn on PATH)
node node_modules/vite/bin/vite.js --port 3000

# in another terminal, from this folder of the Workers repo
npx workers-port port \
  --config <path-to>/bulletproof-react/apps/react-vite/playwright.config.ts \
  --app <path-to>/bulletproof-react/apps/react-vite \
  --mutants workers.mutants.json \
  --url http://localhost:3000/ --grep "profile" --agent claude
```

`workers.mutants.json` holds two mutants:

- **B1 (bug):** the profile update drops the bio.
- **R1 (refactor):** the notification's close button label changes from "Close" to "Dismiss", with the same look and behaviour.
