---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# The subtotal adds up every line with its quantity

## Sign in and verify the empty cart
Type "demo@inkwell.test" into the "Email" box.
Type "inkwell-demo" into the "Password" box.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Verify the exact visible text of the cart item count is "0".

## Add the products
Click the button to add "Fountain Pen" to the cart.
Click the button to add "Spiral Notebook" to the cart.
Click the button to add "Spiral Notebook" to the cart.

## Open the cart and verify the amounts
Click the cart link.
Verify the exact visible text of the subtotal is "$42.00".
Verify the exact visible text of the total is "$42.00".
