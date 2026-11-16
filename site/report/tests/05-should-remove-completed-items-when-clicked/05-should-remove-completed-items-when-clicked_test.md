---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Should remove completed items when clicked

## Add the default todos
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Type "book a doctors appointment" into the "What needs to be done?" box and press Enter.

## Clear the completed todo
Check the checkbox for "feed the cat".
Click the "Clear completed" button.
Verify the list shows exactly these items, in this order: "buy some cheese", "book a doctors appointment".
