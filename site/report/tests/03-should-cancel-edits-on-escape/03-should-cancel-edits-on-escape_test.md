---
mode: testing
url: http://localhost:4173/
headless: true
max_steps: 15
---

# Should cancel edits on escape

## Create the default todos
Type "buy some cheese" into the "What needs to be done?" box and press Enter.
Type "feed the cat" into the "What needs to be done?" box and press Enter.
Type "book a doctors appointment" into the "What needs to be done?" box and press Enter.
Reload the page.
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat", "book a doctors appointment".

## Cancel an edit with Escape
Double-click the "feed the cat" todo item.
Replace its text with "buy some sausages".
Press Escape to cancel the edit.
Verify the list shows exactly these items, in this order: "buy some cheese", "feed the cat", "book a doctors appointment".
