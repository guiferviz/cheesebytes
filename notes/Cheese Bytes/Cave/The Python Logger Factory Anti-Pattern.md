Imagine you have this `get_logger` function in your `utils.py` file of your **library**:

```python
import logging

def get_logger():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s: %(message)s",
    )
    logging.getLogger("another_package").setLevel(logging.WARNING)
    return logging.getLogger(__name__)
```

While it seems convenient to import a single function from `utils.py` to get a ready-to-use logger, this approach introduces three significant issues:

| Problem                           | Why it hurts                                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`basicConfig()` is a one-shot** | Only the _first_ call in the entire process has any effect. If someone imported a different module that logged **before** this helper ran, your formatting/levels never take hold; if you call it later it’s silently ignored. |
| **Pollutes global state**         | Tweaking `logging.getLogger("another_package").setLevel(...)` from a utility file surprises anyone who actually owns _that_ package. Libraries shouldn’t decide how noisy their siblings are.                                  |
| **Hides provenance**              | Every log coming through this helper gets the same name (`your_package.utils`), so you can’t tell which module really emitted the message.                                                                                     |

# Let Each Module Own its Logger


```python
# any_module.py
import logging
logger = logging.getLogger(__name__)
```

Now the logger name (`package.subpackage.any_module`) tells you exactly where the record came from and follows the normal hierarchy for filtering.

# Configure Logging Once

Your entry-point is the right place to configure your logging. It should look something like:

```python
# main.py (or the CLI / notebook / job driver)
import logging

# Config must run before any other log call. 
logging.basicConfig(
	level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s: %(message)s",
)
# If you *really* need to silence a chatty dependency, do it here:
logging.getLogger("another_package").setLevel(logging.WARNING)
# ... rest of your application...
```

Because this code is the first to touch `logging`, `basicConfig()` takes effect exactly once, and you keep all global tweaks in one obvious place.

If you are developing a library, it won't have an entry point, so avoid configuring logging within the library. Remember:

> _“A good library is a polite house-guest: it cleans up after itself and never rearranges the furniture.”_  
> — _Chat GPT_