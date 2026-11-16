---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# Increasing the quantity updates the line total and subtotal

## Sign in and verify the empty cart
Type "demo@inkwell.test" into the "Email" box.
Type "inkwell-demo" into the "Password" box.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Verify the exact visible text of the cart badge is "0".

## Add the notebook and open the cart
Click the button to add "Spiral Notebook" to the cart.
Click the "Cart" link.
Verify the exact visible line total for "Spiral Notebook" is "$12.00".

## Increase the notebook quantity
Click the button to increase the quantity of "Spiral Notebook".
Verify the exact visible quantity for "Spiral Notebook" is "2".
Verify the exact visible line total for "Spiral Notebook" is "$24.00".
Verify the exact visible subtotal is "$24.00".
