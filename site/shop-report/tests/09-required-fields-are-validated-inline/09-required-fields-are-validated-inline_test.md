---
mode: testing
url: http://localhost:4174/
headless: true
max_steps: 15
---

# Required fields are validated inline

## Sign in and add items to the cart
Sign in with email "demo@inkwell.test" and password "inkwell-demo".
Verify the "Stationery" heading is visible.
Add "Fountain Pen" to the cart.
Add "Spiral Notebook" to the cart twice.
Open the cart.

## Try to place the order without checkout details
Click the "Place order" button.
Verify the message "Name is required" is visible.
Verify the message "Email is required" is visible.
Verify the message "Address is required" is visible.
Verify the "Order confirmed" heading is not visible.
