# Admin visibility and printed customization highlights

## Changes
- Make the per-user order visibility switch available for admin accounts as well.
- Stop granting all-order visibility solely because a user has the admin role; honor each admin's saved switch setting.
- In management order forms, detect non-standard size, reversed L-shape orientation, non-30-inch leg height, non-normal wire-hole selection, non-O leg shape, and non-1.5x1.5 leg size.
- Render each non-standard value in a strong red contrasting style in both browser print and emailed PDF copies.
- Keep the existing custom-order seal and expand its detection to the same non-standard rules.

## Validation
- Check the user-management switch state and order-form output in the preview.
- Confirm the affected TypeScript files pass the project’s automatic checks.
