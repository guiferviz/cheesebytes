The design choice to place the schema and metadata (footer) at the end of
[[Apache Parquet]] files offers several advantages:

1. **Efficient File Writing**: The total number of rows, row groups, and column
   statistics are only known after writing all data. Placing the footer at the
   end allows the writer to accumulate necessary metadata during the write
   process and append it once all data is written.
2. **Support for Streaming Writes**: In streaming scenarios, placing the footer
   at the end allows for continuous data writing without needing to seek back to
   the beginning to update the header with metadata.
3. **Backward Compatibility**: Placing the footer at the end allows for easier
   backward compatibility and file format evolution. New metadata fields can be
   added to the footer without disrupting the existing file structure.
