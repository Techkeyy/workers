import type { Page } from '@playwright/test';

export interface CheckoutDetails {
  name: string;
  email: string;
  address: string;
}

export class CartPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { name: 'Your cart' });
  }
  get lines() {
    return this.page.getByTestId('cart-line');
  }
  get subtotal() {
    return this.page.getByTestId('subtotal');
  }
  get discount() {
    return this.page.getByTestId('discount');
  }
  get total() {
    return this.page.getByTestId('total');
  }
  get couponInput() {
    return this.page.getByLabel('Coupon code');
  }
  get couponStatus() {
    return this.page.getByRole('status');
  }
  get couponError() {
    return this.page.getByRole('alert');
  }
  get nameInput() {
    return this.page.getByLabel('Full name');
  }
  get emailInput() {
    return this.page.getByLabel('Email address');
  }
  get addressInput() {
    return this.page.getByLabel('Shipping address');
  }
  get confirmation() {
    return this.page.getByRole('heading', { name: 'Order confirmed' });
  }
  get orderNumber() {
    return this.page.getByTestId('order-number');
  }

  line(productName: string) {
    return this.lines.filter({ hasText: productName });
  }

  validationMessage(text: string) {
    return this.page.getByText(text, { exact: true });
  }

  async increase(productName: string) {
    await this.page.getByRole('button', { name: `Increase quantity of ${productName}` }).click();
  }

  async remove(productName: string) {
    await this.page.getByRole('button', { name: `Remove ${productName}` }).click();
  }

  async applyCoupon(code: string) {
    await this.couponInput.fill(code);
    await this.page.getByRole('button', { name: 'Apply coupon' }).click();
  }

  async fillCheckout({ name, email, address }: CheckoutDetails) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.addressInput.fill(address);
  }

  async placeOrder() {
    await this.page.getByRole('button', { name: 'Place order' }).click();
  }
}
