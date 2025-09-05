Normally, [[Apache Spark]] Structured Streaming expects you to **continuously write to a sink** using methods like `.writeStream.format("delta").start()`.

`MERGE` operations (upserts) are **not supported** directly in streaming sinks. That is where `foreachBatch` comes in: it lets you write arbitrary batch logic, including `MERGE INTO`, joins, custom transformations, etc.

| Action you want to do       | Needs `foreachBatch`? |
| --------------------------- | --------------------- |
| Simple append to Delta      | ❌ No                  |
| Merge/upsert into Delta     | ✅ Yes                 |
| Write to an external system | ✅ Yes                 |
| Use complex Python logic    | ✅ Yes                 |
