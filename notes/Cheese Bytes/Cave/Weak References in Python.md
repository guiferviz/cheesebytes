In [[Python]], a weak reference to an object is not enough to keep the object
alive: when the only remaining references to a referent are weak
references, [garbage collection](https://docs.python.org/3/glossary.html#term-garbage-collection) is
free to destroy the referent and reuse its memory for something else. This is
useful in situations where you want to hold a reference to an object, but you
don't want that reference to keep the object alive.

# Minimal Example

```python
import weakref

class Dict(dict):  # this class is weak referenceable, dict is not.
    pass

# Create an object.
obj = Dict(region="NYC", inhabitants=123234)

# Create a weak reference to the object.
weak_obj_ref = weakref.ref(obj)

# Access the referenced object through the weak reference
print("Before deleting obj:", weak_obj_ref())  # {'region': 'NYC', 'inhabitants': 123234}

# Delete the strong reference to the object.
del obj

# At this point, the original object may be garbage-collected
print("After deleting obj:", weak_obj_ref())  # None
```

# Practical Example

Imagine you are building a caching system for an image processing application.
You want to cache the processed images to speed up future access, but you don't
want the cached images to prevent the application from freeing up memory when
it's needed. Using weak references allows the cache to automatically discard
entries when the images are no longer in use elsewhere in the application.

Here's an example using `weakref.WeakValueDictionary` for this purpose:

```python
import weakref
from PIL import Image, ImageFilter

# Create a WeakValueDictionary for the cache
image_cache = weakref.WeakValueDictionary()

def process_image(image_path):
    # Check if the processed image is in the cache
    if image_path in image_cache:
        print("Loading from cache")
        return image_cache[image_path]

    # If not, load and process the image
    print("Processing image")
    image = Image.open(image_path)
    processed_image = image.filter(ImageFilter.GaussianBlur(15))

    # Store the processed image in the cache
    image_cache[image_path] = processed_image

    return processed_image

# Example usage
image_path = 'example.jpg'

# First call - processes and caches the image
processed_image1 = process_image(image_path)

# Second call - loads the image from the cache
processed_image2 = process_image(image_path)

# Delete the strong reference to the processed image
del processed_image1

# The cache entry will be removed when the object is no longer in use
print("Cache contents after deleting processed_image1:", dict(image_cache))
```

# Links

Python [Docs](https://docs.python.org/3/library/weakref.html).
