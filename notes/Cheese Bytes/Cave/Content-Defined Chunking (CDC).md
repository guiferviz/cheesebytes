Content-Defined Chunking (CDC) is a technique for splitting data into
variable-sized chunks based on the content itself rather than fixed byte
boundaries. Instead of trying to find "natural" points in a file (like the end
of a paragraph), CDC uses a sliding window and a simple hash function (like a
polynomial hash) to look at the data as a stream of bytes.

A chunk boundary is set whenever the hash of the current window happens to match
a certain condition. For example, when the hash ends in a few zero bits. It is
not about detecting any meaningful pattern, just a cheap rule that statistically
triggers every so often.

This might sound a bit random, but it works really well: even if a few bytes are
inserted or moved around, most of the chunk boundaries will stay the same. That
makes CDC great for spotting duplicate regions in files, which is why it is used
in things like rsync, ZFS, and Dropbox.
