import { test, expect } from './fixtures';

test.beforeEach(async ({ shopPage }) => {
  await expect(shopPage.cartBadge).toHaveText('0');
});

test.describe('Cart', () => {
  test('adding items updates the cart badge', async ({ shopPage }) => {
    await shopPage.addToCart('Fountain Pen');
    await expect(shopPage.cartBadge).toHaveText('1');
    await shopPage.addToCart('Blue-Black Ink');
    await expect(shopPage.cartBadge).toHaveText('2');
  });

  test('increasing the quantity updates the line total and subtotal', async ({ shopPage, cartPage }) => {
    await shopPage.addToCart('Spiral Notebook');
    await shopPage.openCart();
    await expect(cartPage.line('Spiral Notebook').getByTestId('line-total')).toHaveText('$12.00');
    await cartPage.increase('Spiral Notebook');
    await expect(cartPage.line('Spiral Notebook').getByTestId('qty')).toHaveText('2');
    await expect(cartPage.line('Spiral Notebook').getByTestId('line-total')).toHaveText('$24.00');
    await expect(cartPage.subtotal).toHaveText('$24.00');
  });

  test('removing a line leaves the other items alone', async ({ shopPage, cartPage }) => {
    await shopPage.addToCart('Fountain Pen');
    await shopPage.addToCart('Spiral Notebook');
    await shopPage.openCart();
    await expect(cartPage.lines).toHaveCount(2);
    await cartPage.remove('Fountain Pen');
    await expect(cartPage.lines).toHaveCount(1);
    await expect(cartPage.line('Spiral Notebook')).toBeVisible();
    await expect(cartPage.subtotal).toHaveText('$12.00');
    await expect(shopPage.cartBadge).toHaveText('1');
  });

  test('the subtotal adds up every line with its quantity', async ({ shopPage, cartPage }) => {
    await shopPage.addToCart('Fountain Pen');
    await shopPage.addToCart('Spiral Notebook', 2);
    await shopPage.openCart();
    await expect(cartPage.subtotal).toHaveText('$42.00');
    await expect(cartPage.total).toHaveText('$42.00');
  });
});
