---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# should append new items to the bottom of the list

## Add the default todo items

Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Type "book a doctors appointment" into the "What needs to be done?" box and press Enter.

## Verify the todo count and item order

Verify the exact visible text of the todo counter in the footer is "3 items left".
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat", "book a doctors appointment".

## Verify the items persist after reloading

Reload the page.
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat", "book a doctors appointment".
