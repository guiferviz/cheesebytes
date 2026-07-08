When exporting data files from Unity Catalog managed tables, do not register the
exported files as Unity Catalog tables inside a volume.

You may see an error like this if you try to create a table over a volume path:

    Unsupported path operation PATH_CREATE_TABLE on volume

This happens because Unity Catalog treats **tables** and **volumes** as
different object types:

- **Tables** are governed tabular datasets registered in Unity Catalog.
- **Volumes** are path-based storage locations for files, such as CSV, JSON,
  Parquet, Delta files, configs, or exports.

The recommended approach is to export the managed table as files into a volume,
but keep those files as files; do not register them as a Unity Catalog table
inside the volume.

Example:

```python
df = spark.table("my_catalog.my_schema.my_table")

(
    df.write
      .format("delta")
      .mode("overwrite")
      .save("/Volumes/my_catalog/my_schema/my_volume/exports/my_table_delta")
)
```

Do not do this:

```sql
CREATE TABLE my_catalog.my_schema.exported_table
USING DELTA
LOCATION '/Volumes/my_catalog/my_schema/my_volume/exports/my_table';
```

If the data needs to be consumed as a Unity Catalog table, keep it as a managed
table or create an external table in a valid table location outside the volume.

If the goal is file export or downstream file-based consumption, write the files
to the volume and consume them by path.
