As discussed in [[Do I Need to Remove a Broadcasted Spark Variable]], we do not
need to remove broadcasted variables in Spark. However, if we are concerned
about memory usage, especially with very large broadcast variables, we can
manually remove them from memory using the `unpersist` or `destroy` methods.

- **unpersist**: This method removes the broadcast variable from memory but
  keeps the metadata around.

```python
broadcast_var.unpersist()
```

- **destroy**: This method not only removes the broadcast variable from memory
  but also removes all the associated metadata. Once destroyed, the broadcast
  variable cannot be re-broadcasted within the same application.

```python
broadcast_var.destroy()
```
