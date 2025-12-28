Imagine you own a pizza place. You have a delivery guy and 10 orders to deliver.

The **N+1 problem** is like sending your delivery guy to the kitchen for the
first pizza, delivering it, going back for the second, delivering it, and so on
10 times. It's inefficient, slow, and exhausts your delivery guy.

The smart thing would be: "Hey, take all 10 pizzas in one trip".

In the ORM world (like SQLAlchemy), this is the most common and silent
performance bug. Let's see it with a real example.

# The Setup

We have a classic multi-tenant booking system:

- A **Tenant** (Customer/Organization).
- Many **Resources** (Rooms, desks, cars...).

A textbook `1:N` relationship.

## The Models (SQLAlchemy 2.0)

```python
from __future__ import annotations
import uuid
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase

class Base(DeclarativeBase):
    pass

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)

    # By default, SQLAlchemy uses lazy="select".
    # This means: "Don't load this until someone asks for it".
    resources: Mapped[list["Resource"]] = relationship(back_populates="tenant")

class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="resources")
```

# The Problem: The Silent Trap

You write this Python code. It looks innocent, clean and correct:

```python
from sqlalchemy import select

# 1. Fetch all tenants (let's say there are 50)
tenants = session.scalars(select(Tenant)).all()

# 2. Loop through them to print their resources
for t in tenants:
    # HERE'S THE TRAP!
    # Accessing .resources forces SQLAlchemy to hit the DB
    print(f"Tenant: {t.name}")
    print(f"Resources: {[r.name for r in t.resources]}")
```

## What happens under the hood (SQL)

Your database starts screaming in silence:

1. **Query 1**: Give me all tenants.
   ```sql
   SELECT * FROM tenants;
   ```
2. **Query 2... N+1**: For each tenant, give me its resources.
   ```sql
   SELECT * FROM resources WHERE tenant_id = 'uuid-1';
   SELECT * FROM resources WHERE tenant_id = 'uuid-2';
   SELECT * FROM resources WHERE tenant_id = 'uuid-3';
   -- ... 50 times
   ```

If you have 50 tenants, you just made **51 queries**. If you have 1,000, you've
killed your app.

This usually blows up in JSON serializers (`.to_dict()`), HTML templates, or
anywhere you access related properties without thinking.

# Fix 1: The Scalpel (Explicit Loading)

This is the recommended approach for most cases. You explicitly tell SQLAlchemy:
_"Hey, I'm going to need the resources, fetch them now"_.

We use `selectinload` (ideal for 1:N relationships).

```python
from sqlalchemy import select
from sqlalchemy.orm import selectinload

stmt = (
    select(Tenant)
    .options(selectinload(Tenant.resources))  # <--- The magic
)

tenants = session.scalars(stmt).all()

for t in tenants:
    # This does NOT make extra queries anymore, data is already in memory.
    print(t.resources)
```

## The resulting SQL

Pure magic. Only 2 queries, no matter how many tenants you have:

1. **Query 1**: Give me the tenants.
   ```sql
   SELECT * FROM tenants;
   ```
2. **Query 2**: Give me the resources for **all** those tenants at once.
   ```sql
   SELECT * FROM resources WHERE tenant_id IN ('uuid-1', 'uuid-2', ...);
   ```

We went from **1 + N** to **2**.

More about this in the official docs:
https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html#select-in-loading

# Fix 2: Autopilot (Model Configuration)

Sometimes you know you'll _always_ need the resources when loading a tenant. You
can change the default behavior in the model.

```python
class Tenant(Base):
    __tablename__ = "tenants"
    # ...
    resources: Mapped[list["Resource"]] = relationship(
        back_populates="tenant",
        lazy="selectin"  # <--- We change the default here
    )
```

With this, when you do `select(Tenant)`, **SQLAlchemy automatically executes
BOTH queries**:

```python
tenants = session.scalars(select(Tenant)).all()
# Query 1: SELECT * FROM tenants
# Query 2: SELECT * FROM resources WHERE tenant_id IN (...)  <-- Runs immediately!

# At this point, .resources is ALREADY populated for all tenants.
# No additional queries happen when you access it:
for t in tenants:
    print(t.resources)  # Already in memory, no DB hit
```

This is different from the default `lazy="select"`, where the query runs _when
you access the attribute_. With `lazy="selectin"`, the collection is
**pre-populated** the moment you load the parent objects.

From the SQLAlchemy docs:

> "whenever a collection of Parent objects are loaded, each Parent will also
> have its children collection **populated**, using the "selectin" loader
> strategy that emits a second query."
>
> https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html#configuring-loader-strategies-at-mapping-time

## Why not use this all the time?

Because you **always** pay the cost of loading the related data, even if you
never use it. Imagine you load 100 tenants for a simple listing (just names).
Even though you never access `.resources`, SQLAlchemy will still execute the
second query to load all resources for those 100 tenants. Wasted bandwidth,
memory, and CPU.

With explicit `selectinload` in the query, you decide when to pay that cost.
With `lazy="selectin"` in the model, you **always** pay it whether you need the
data or not.

# Summary: The Golden Rule

1. **By default**, keep it `lazy="select"` (the default). Don't load anything
   you didn't ask for.
2. **In your endpoints/logic**, use `selectinload()` when you know you'll need
   the related data. It's explicit and efficient.
3. **Reserve `lazy="selectin"`** in the model only for relationships that you
   **always** need when loading the parent (e.g., invoice lines that are
   meaningless without them).

Or put another way:

| Approach                   | When related data loads       | Cost                            |
| -------------------------- | ----------------------------- | ------------------------------- |
| `lazy="select"` (default)  | On attribute access (N+1! ⚠️) | Pay per access (dangerous)      |
| `selectinload()` in query  | Immediately, 2 queries total  | Pay only when you ask for it ✅ |
| `lazy="selectin"` in model | Immediately, 2 queries total  | Pay **always**, even if unused  |

**Best practice**: Use explicit `selectinload()` per-query for full control.
