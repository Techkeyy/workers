import { test as base, expect, type Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ShopPage } from './pages/ShopPage';
import { CartPage } from './pages/CartPage';

// Fake demo account shipped with the sample shop (see app/app.js). Not a real credential.
export const DEMO_USER = { email: 'demo@inkwell.test', password: 'inkwell-demo' };

type Fixtures = {
  loggedInPage: Page;
  shopPage: ShopPage;
  cartPage: CartPage;
};

export const test = base.extend<Fixtures>({
  loggedInPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.email, DEMO_USER.password);
    await expect(page.getByRole('heading', { name: 'Stationery' })).toBeVisible();
    await use(page);
  },
  shopPage: async ({ loggedInPage }, use) => {
    await use(new ShopPage(loggedInPage));
  },
  cartPage: async ({ loggedInPage }, use) => {
    await use(new CartPage(loggedInPage));
  },
});

export { expect };
