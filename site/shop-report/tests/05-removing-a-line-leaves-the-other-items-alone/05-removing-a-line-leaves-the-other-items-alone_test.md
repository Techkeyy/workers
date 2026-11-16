---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# Removing a line leaves the other items alone

## Sign in and confirm the empty cart
Type "demo@inkwell.test" into the Email field.
Type "inkwell-demo" into the Password field.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Verify the exact visible text of the cart item count is "0".

## Add two items and open the cart
Click the button to add "Fountain Pen" to the cart.
Click the button to add "Spiral Notebook" to the cart.
Click the Cart link.
Verify the cart shows 2 line items.

## Remove one item and verify the remaining cart
Click the button to remove "Fountain Pen".
Verify the cart shows 1 line item.
Verify "Spiral Notebook" is visible in the cart.
Verify the exact visible text of the subtotal is "$12.00".
Verify the exact visible text of the cart item count is "1".
