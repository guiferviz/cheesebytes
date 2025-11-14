In [[Java]], the main difference between _SoftReference_ and _WeakReference_ is
how the collector will work with them. It can delete an object at any time if
only weak links point to it, on the other hand, objects with a soft link will be
collected only when _the JVM_ really needs memory.
