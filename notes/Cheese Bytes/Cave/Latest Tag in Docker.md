The `latest` tag in [[Docker]] is a commonly used tag that often, but not
necessarily, points to the most recent version of an image. It is a default tag
that can be applied to any image version, depending on how the image is tagged
and managed.

The `latest` tag is not immutable. Each time an image is built and tagged
as `latest`, it overwrites the previous image that had the `latest` tag. This
means that the `latest` image can change frequently, depending on how often new
versions are built and tagged.

# Why `latest` Tag Might Not Point to the Latest Version

The `latest` tag might not be updated if developers do not consistently tag the
latest version of their image as `latest`. For instance, they might push a new
image with a specific version tag like `2.0` but forget to update
the `latest` tag.
