---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Should display the current number of todo items

## Add the first todo
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Verify the todo counter shows "1".

## Add the second todo
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Verify the todo counter shows "2".
Reload the page. Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat".
