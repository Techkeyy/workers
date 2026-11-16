import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { name: 'Sign in' });
  }
  get emailInput() {
    return this.page.getByLabel('Email');
  }
  get passwordInput() {
    return this.page.getByLabel('Password');
  }
  get submitButton() {
    return this.page.getByRole('button', { name: 'Sign in' });
  }
  get error() {
    return this.page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
