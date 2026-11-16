---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# A valid order is confirmed with an order number

## Sign in and prepare the cart
Type "demo@inkwell.test" into the Email field.
Type "inkwell-demo" into the Password field.
Click the "Sign in" button.
Verify the "Stationery" heading is visible.
Click the button to add "Fountain Pen" to the cart.
Click the button to add "Spiral Notebook" to the cart.
Click the button to add "Spiral Notebook" to the cart again.
Open the cart.

## Apply the coupon and enter checkout details
Type "INK10" into the "Coupon code" field.
Click the "Apply coupon" button.
Type "Ada Lovelace" into the "Full name" field.
Type "ada@example.test" into the "Email address" field.
Type "12 Analytical Way, London" into the "Shipping address" field.

## Place the order
Click the "Place order" button.
Verify the "Order confirmed" heading is visible.
Verify the visible order number matches "Order number: INK-" followed by exactly five digits.
Verify the exact visible text of the cart badge is "0".
