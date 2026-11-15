---
mode: testing
max_steps: 15
headless: true
url: http://localhost:4173/
---

# Counter shows the current number of todo items

## Add the first todo
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Verify the todo counter reads "1 item left".

## Add the second todo
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Verify the todo counter reads "2 items left".
Reload the page and verify both todos, "buy some cheese" and "feed the cat", are still listed.
