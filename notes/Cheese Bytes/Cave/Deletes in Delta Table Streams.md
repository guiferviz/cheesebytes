By default, deletes in a [[Delta Lake|Delta Table]] cause a streaming query to fail, as [[Spark Streaming]] expects append-only sources. This ensures data integrity but requires configuration to handle deletes without interrupting the stream:

* `ignoreDeletes` or `skipChangeCommits`, described in [the docs](https://docs.databricks.com/aws/en/structured-streaming/delta-lake#ignore-updates-and-deletes).
* [[Delta Table Change Data Feed (CDF)]].