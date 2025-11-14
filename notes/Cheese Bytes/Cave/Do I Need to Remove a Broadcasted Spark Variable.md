In [[Apache Spark]], you don't need to explicitly remove a broadcasted variable.
Spark automatically handles the lifecycle of broadcast variables, and they will
be cleaned up by the garbage collector when no longer needed.

Spark has a `ContextCleaner` which runs on periodic interval to delete broadcast
variable if it is not being used. It does that using
[[Weak References in Python|Weak References]] (link is about weak references in
Python, but the same applies to Java). Reference:
https://stackoverflow.com/questions/54731255/spark-broadcast-variables-life-time
