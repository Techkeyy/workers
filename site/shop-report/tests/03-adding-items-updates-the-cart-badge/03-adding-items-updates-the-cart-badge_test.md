---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# Adding items updates the cart badge

## Sign in to the stationery shop
Type "demo@inkwell.test" into the "Email" box.
Type "inkwell-demo" into the "Password" box.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Verify the exact visible text of the cart badge is "0".

## Add the fountain pen
Click the button labeled "Add Fountain Pen to cart".
Verify the exact visible text of the cart badge is "1".

## Add the blue-black ink
Click the button labeled "Add Blue-Black Ink to cart".
Verify the exact visible text of the cart badge is "2".
