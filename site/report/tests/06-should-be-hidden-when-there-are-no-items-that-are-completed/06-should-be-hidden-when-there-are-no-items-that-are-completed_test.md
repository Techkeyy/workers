---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Clear completed is hidden when there are no completed items

## Add the default todos
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Type "book a doctors appointment" into the "What needs to be done?" box and press Enter.

## Complete and clear a todo
Check the checkbox for "buy some cheese".
Click the "Clear completed" button.
Verify the "Clear completed" button is hidden.
