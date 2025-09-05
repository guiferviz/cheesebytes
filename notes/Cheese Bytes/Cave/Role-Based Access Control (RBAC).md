Role-Based Access Control (RBAC) is a security model that manages access to
systems and data by assigning permissions to roles instead of individual users.
Users inherit permissions through their assigned roles, making access management
simpler, more secure, and scalable.

# How RBAC Works

1. **Define Roles**. Create roles aligned with job functions (e.g., HR
   Specialist, Accountant).
2. **Assign Permissions**. Link permissions (read, write, modify) to each role.
3. **Assign Users/Groups**. Place users/groups into one or more roles based on
   their responsibilities.
4. **Enforce Access**. Systems check a user's roles and associated permissions
   before granting access.

# Groups vs Roles

A common source of confusion is the difference between **groups** and **roles**.
Technically, in **Azure Entra ID** both groups and roles are the same type of
entity (security principals). However, in our RBAC model we give them
**different meanings** to keep access management clear.

- **Group (Entra ID)**  
  A _set of people_. Defines **who** the users are (e.g., all HR employees).  
  → _Answers: Who?_

- **Role (RBAC meaning)**  
  A _set of permissions_. Defines **what** actions are allowed (e.g., read HR
  tables, create reports).  
  → _Answers: What can they do?_
  > [!note]  
  > In practice, a role is also an Entra ID group — we simply use it to
  > represent a permission bundle rather than a team of people.

## How they connect

You should **not assign permissions directly to groups of people**. Instead, use
this chain:

```
Users → Groups (Entra ID, people/teams) → Roles (Entra ID, permission bundles) → Permissions
```

## Example

- **Group (Entra ID):** `Finance_Analysts` (people).
- **Role (Entra ID):** `finance_reader` (permission bundle).
- **Permission (UC):** `SELECT` on `catalog finance`.

Chain in action:  
`Alice` (user) ∈ `Finance_Analysts` (group) → gets `finance_reader` (role) →
inherits `SELECT` (permission).

# Summary

- Groups (people/teams) = who the users are.
- Roles (permission bundles) = what permissions exist.
- Both are technically Entra ID groups, but we assign them different
  **meanings** for clarity.
- RBAC works by assigning people-groups to role-groups, and role-groups to
  permissions.
