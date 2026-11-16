import { test, expect, DEMO_USER } from './fixtures';
import { LoginPage } from './pages/LoginPage';
import { ShopPage } from './pages/ShopPage';

test.describe('Sign in', () => {
  test('signs in with the demo account and lands on the shop', async ({ page }) => {
    const login = new LoginPage(page);
    const shop = new ShopPage(page);
    await login.goto();
    await expect(login.heading).toBeVisible();
    await login.login(DEMO_USER.email, DEMO_USER.password);
    await expect(shop.heading).toBeVisible();
    await expect(shop.signedInAs).toHaveText('demo@inkwell.test');
    await expect(shop.productCards).toHaveCount(6);
  });

  test('shows an error for a wrong password', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(DEMO_USER.email, 'not-the-password');
    await expect(login.error).toHaveText('Invalid email or password.');
    await expect(login.heading).toBeVisible();
  });
});
