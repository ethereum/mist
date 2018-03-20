module.exports = async (
  markdown,
  metaData
) => `_Write a brief description of this release._

### Checksums

| File         | Checksum (SHA256) |
| ------------ | ----------------- |
| _Asset name_ | _Asset checksum_  |

${markdown}`;
