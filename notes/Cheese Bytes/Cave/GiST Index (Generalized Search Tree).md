**GiST** stands for **Generalized Search Tree**. Unlike a B-Tree index (which is
perfect for sorting and equality checks like `=`, `<`, `>`), GiST is a framework
that allows indexing complex data types like:

- **Geometric data** (PostGIS uses R-Trees implemented via GiST).
- **Full-text search** (searching for words inside documents).
- **Range types** (Time ranges, integer ranges).

YouTube Video with a nice visual explanation:
https://www.youtube.com/watch?v=zw4-Hpm7ysk

# Example: Time Ranges

Imagine a booking system, we constantly ask: _Does this new time range overlap
with any existing booking?_

- **B-Tree**: Can efficiently find bookings starting _after_ X or ending
  _before_ Y. But finding overlaps requires checking two conditions
  simultaneously (`start < request_end AND end > request_start`), which B-Trees
  struggle to optimize perfectly.
- **GiST**: Can index a **Range** (like `tsrange` in PostgreSQL) as a single
  geometric-like object. It supports operators like `&&` (overlap), `@>`
  (contains), and `<@` (contained by) natively.

## Example in PostgreSQL

```sql
-- Create an index on the 'duration' column (tsrange type) of a table containing bookings.
CREATE INDEX booking_duration_idx ON bookings USING GIST (duration);

-- Efficiently find overlaps
SELECT * FROM bookings
WHERE duration && '[2025-01-01 10:00, 2025-01-01 11:00)';
```
