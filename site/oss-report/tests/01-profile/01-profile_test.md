---
mode: testing
url: http://localhost:3000/
headless: true
max_steps: 15
---

# profile

## Go to the registration form
Click the "Get started" button.
Click the "Register" link.

## Register a new account
Type "Ada" into the "First Name" box.
Type "Lovelace" into the "Last Name" box.
Type "ada@example.test" into the "Email Address" box.
Type "Password123!" into the "Password" box.
Type "Workers" into the "Team Name" box.
Click the "Register" button.

## Sign out and log back in
Click the "Open user menu" button.
Click the "Sign Out" menu item.
Type "ada@example.test" into the "Email Address" box.
Type "Password123!" into the "Password" box.
Click the "Log in" button.

## Open the profile and update the bio
Click the "Open user menu" button.
Click the "Your Profile" menu item.
Click the "Update Profile" button.
Click the "Bio" box.
Type "My bio" into the "Bio" box.
Click the "Submit" button.
Click the "Close" button in the "Profile Updated" dialog.

## Verify the bio was saved
Verify the text "My bio" is visible on the page.
