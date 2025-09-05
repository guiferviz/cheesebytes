In [[Python UV]] workspaces, there are three key concepts that got me confused
at first:

- **Members (`[tool.uv.workspace].members`)**: local packages in the workspace
  (this means they share the lockfile). This is what _adds a project to the
  workspace_.
- **Dependencies (`[project].dependencies`)**: package A declares it depends on
  package B (by name).
- **Sources (`[tool.uv.sources]`)**: control _where_ those names resolve from.
  Use `B = { workspace = true }` so A uses the _local_ B (member), not PyPI.

**Recommended flow**

1. Add each package to `workspace.members` (root).
2. In package **A**, list **B** in `project.dependencies`.
3. In the root (or in **A**), map `B = { workspace = true }`.

**Gotcha**

- Without `sources`, if **B** exists on PyPI, it will be installed from PyPI; if
  it does not, resolution fails.

**Root as container**

- Keep `dependencies = []` if the root does not use anything itself.
