---
mode: testing
url: http://localhost:4183/
headless: true
max_steps: 15
---

# should display the current number of todo items

## Add the first todo
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Verify the exact visible text of the todo counter is "1 item left".

## Add the second todo
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Verify the exact visible text of the todo counter is "2 items left".

## Reload and check persistence
Reload the page.
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat".
Verify the exact visible text of the todo counter is "2 items left".
