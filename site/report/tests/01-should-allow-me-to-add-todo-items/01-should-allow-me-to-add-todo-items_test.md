---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Should allow me to add todo items

## Add the first todo
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Verify the list shows exactly these items, in this order: "buy some cheese".

## Add the second todo
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat".
Reload the page.
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat".
