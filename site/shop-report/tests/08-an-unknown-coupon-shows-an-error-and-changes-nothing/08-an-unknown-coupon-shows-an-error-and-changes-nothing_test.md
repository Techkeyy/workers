---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# An unknown coupon shows an error and changes nothing

## Sign in and add items to the cart
Type "demo@inkwell.test" into the Email box.
Type "inkwell-demo" into the Password box.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Click the "Add Fountain Pen to cart" button once.
Click the "Add Spiral Notebook to cart" button twice.
Open the Cart.

## Apply the unknown coupon
Type "FREESTUFF" into the Coupon code box.
Click the "Apply coupon" button.
Verify the exact visible text of the coupon error message is "Invalid coupon code."
Verify the exact visible text of the cart total is "$42.00".
