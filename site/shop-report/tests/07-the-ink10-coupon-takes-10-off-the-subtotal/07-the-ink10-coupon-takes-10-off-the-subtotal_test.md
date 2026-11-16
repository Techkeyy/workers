---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# The INK10 coupon takes 10% off the subtotal

## Sign in and add items to the cart
Type "demo@inkwell.test" into the Email box.
Type "inkwell-demo" into the Password box.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Click the button to add "Fountain Pen" to the cart.
Click the button to add "Spiral Notebook" to the cart twice.
Open the Cart.

## Verify the subtotal
Verify the exact visible text of the subtotal is "$42.00".

## Apply the INK10 coupon
Type "INK10" into the Coupon code box.
Click the "Apply coupon" button.
Verify the exact visible text of the coupon status is "Coupon INK10 applied: 10% off.".
Verify the exact visible text of the discount is "-$4.20".
Verify the exact visible text of the total is "$37.80".
