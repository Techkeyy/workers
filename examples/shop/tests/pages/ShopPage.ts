import type { Page } from '@playwright/test';

export class ShopPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { name: 'Stationery' });
  }
  get cartBadge() {
    return this.page.getByTestId('cart-badge');
  }
  get cartLink() {
    return this.page.getByRole('link', { name: /^Cart/ });
  }
  get signedInAs() {
    return this.page.getByTestId('user-email');
  }
  get productCards() {
    return this.page.getByTestId('product-card');
  }

  addToCartButton(productName: string) {
    return this.page.getByRole('button', { name: `Add ${productName} to cart` });
  }

  async addToCart(productName: string, times = 1) {
    for (let i = 0; i < times; i++) {
      await this.addToCartButton(productName).click();
    }
  }

  async openCart() {
    await this.cartLink.click();
  }
}
