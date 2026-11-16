import { test, expect } from './fixtures';

const BUYER = { name: 'Ada Lovelace', email: 'ada@example.test', address: '12 Analytical Way, London' };

test.beforeEach(async ({ shopPage }) => {
  await shopPage.addToCart('Fountain Pen');
  await shopPage.addToCart('Spiral Notebook', 2);
  await shopPage.openCart();
});

test.describe('Coupons', () => {
  test('the INK10 coupon takes 10% off the subtotal', async ({ cartPage }) => {
    await expect(cartPage.subtotal).toHaveText('$42.00');
    await cartPage.applyCoupon('INK10');
    await expect(cartPage.couponStatus).toHaveText('Coupon INK10 applied: 10% off.');
    await expect(cartPage.discount).toHaveText('-$4.20');
    await expect(cartPage.total).toHaveText('$37.80');
  });

  test('an unknown coupon shows an error and changes nothing', async ({ cartPage }) => {
    await cartPage.applyCoupon('FREESTUFF');
    await expect(cartPage.couponError).toHaveText('Invalid coupon code.');
    await expect(cartPage.total).toHaveText('$42.00');
  });
});

test.describe('Checkout', () => {
  test('required fields are validated inline', async ({ cartPage }) => {
    await cartPage.placeOrder();
    await expect(cartPage.validationMessage('Name is required')).toBeVisible();
    await expect(cartPage.validationMessage('Email is required')).toBeVisible();
    await expect(cartPage.validationMessage('Address is required')).toBeVisible();
    await expect(cartPage.confirmation).toBeHidden();
  });

  test('a valid order is confirmed with an order number', async ({ cartPage, shopPage }) => {
    await cartPage.applyCoupon('INK10');
    await cartPage.fillCheckout(BUYER);
    await cartPage.placeOrder();
    await expect(cartPage.confirmation).toBeVisible();
    await expect(cartPage.orderNumber).toHaveText(/^Order number: INK-\d{5}$/);
    await expect(shopPage.cartBadge).toHaveText('0');
  });
});
