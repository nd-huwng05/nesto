# Service Line Contract

Use this response shape for each booked service line returned by backend APIs.

## Required fields

- `line_id` (string): Unique immutable identifier for one booked service line.
- `service_code` (string): Base service code from catalog. Example: `SER-SPA-001`.
- `line_no` (integer): Sequential line number inside one booking for the same service type, starts at `1`.
- `display_code` (string): Human readable code generated from `service_code` + `line_no`.

## Display code rule

- `line_no = 1` -> `display_code = service_code`
- `line_no >= 2` -> `display_code = service_code + '-' + zero-padded(line_no, 2)`

Examples:

- line 1: `SER-SPA-001`
- line 2: `SER-SPA-001-02`
- line 3: `SER-SPA-001-03`

## Important behavior

- Use `line_id` for update/delete operations.
- Do not use `display_code` for writes; it is display-only.
- Keep `line_id` stable after edits to date/time.
- Enforce uniqueness at database level for `(booking_id, service_code, line_no)` when line numbers are generated in backend.

## Suggested response object

```json
{
  "line_id": "sl_01J7EXAMPLE9R2W3D",
  "service_code": "SER-SPA-001",
  "line_no": 2,
  "display_code": "SER-SPA-001-02",
  "name": "Spa Service",
  "date": "08/07/2026",
  "time": "07:00",
  "price": 49
}
```
