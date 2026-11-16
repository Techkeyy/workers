---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# Shows an error for a wrong password

## Submit incorrect sign-in details
Type "demo@inkwell.test" into the "Email" field.
Type "not-the-password" into the "Password" field.
Click the "Sign in" button.

## Verify the sign-in error
Verify the exact visible text of the error message is "Invalid email or password.".
Verify the "Sign in" heading is visible.
