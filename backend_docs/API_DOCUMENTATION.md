Add backend parity for Units, like Categories/Brands/Models:
PATCH /units/{id}/status with { status: boolean }
POST /units/delete-all with { ids: number[] }
Ensure Units include status in responses
Until that is added:
I can hide the Units status toggle and disable the bulk delete button to avoid broken UX
Keep Unit create/update working on unitName only