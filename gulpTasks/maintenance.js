/* eslint-disable
global-require
*/

const _ = require('underscore');
const cmp = require('semver-compare');
const compare = require('json-structure-diff').compareJSONObjects;
const fs = require('fs');
const got = require('got');
const gulp = require('gulp');
const parseJson = require('xml2js').parseString;
const clientBinaries = require('../clientBinaries.json');

gulp.task('update-nodes', cb => {
  const clientBinariesGeth = clientBinaries.clients.Geth;
  const localGethVersion = clientBinariesGeth.version;
  const newJson = clientBinaries;
  const geth = newJson.clients.Geth;

  // Query latest geth version
  got('https://api.github.com/repos/ethereum/go-ethereum/releases/latest', {
    json: true
  })
    .then(response => {
      return response.body.tag_name;
    })
    // Return tag name (e.g. 'v1.5.0')
    .then(tagName => {
      const latestGethVersion = tagName.match(/\d+\.\d+\.\d+/)[0];

      // Compare to current geth version in clientBinaries.json
      if (cmp(latestGethVersion, localGethVersion)) {
        geth.version = latestGethVersion;

        // Query commit hash (first 8 characters)
        got(
          `https://api.github.com/repos/ethereum/go-ethereum/commits/${tagName}`,
          { json: true }
        )
          .then(response => {
            return String(response.body.sha).substr(0, 8);
          })
          .then(hash => {
            let blobs; // azure blobs

            // Query Azure assets for md5 hashes
            got(
              'https://gethstore.blob.core.windows.net/builds?restype=container&comp=list',
              { xml: true }
            )
              .then(response => {
                parseJson(response.body, (err, data) => {
                  // eslint-disable-line
                  if (err) return cb(err);

                  blobs = data.EnumerationResults.Blobs[0].Blob;
                });

                // For each platform/arch in clientBinaries.json
                _.keys(geth.platforms).forEach(platform => {
                  _.keys(geth.platforms[platform]).forEach(arch => {
                    // Update URL
                    let url = geth.platforms[platform][arch].download.url;
                    url = url.replace(
                      /\d+\.\d+\.\d+-[a-z0-9]{8}/,
                      `${latestGethVersion}-${hash}`
                    );
                    geth.platforms[platform][arch].download.url = url;

                    // Update bin name (path in archive)
                    let bin = geth.platforms[platform][arch].download.bin;
                    bin = bin.replace(
                      /\d+\.\d+\.\d+-[a-z0-9]{8}/,
                      `${latestGethVersion}-${hash}`
                    );
                    geth.platforms[platform][arch].download.bin = bin;

                    // Update expected sanity-command version output
                    geth.platforms[platform][
                      arch
                    ].commands.sanity.output[1] = String(latestGethVersion);

                    // Update md5 checksum
                    blobs.forEach(blob => {
                      if (
                        String(blob.Name) ===
                        _.last(
                          geth.platforms[platform][arch].download.url.split('/')
                        )
                      ) {
                        const sum = Buffer.from(
                          blob.Properties[0]['Content-MD5'][0],
                          'base64'
                        );

                        geth.platforms[platform][
                          arch
                        ].download.md5 = sum.toString('hex');
                      }
                    });
                  });
                });
              })
              // Update clientBinares.json
              .then(() => {
                fs.writeFile(
                  './clientBinaries.json',
                  JSON.stringify(newJson, null, 4)
                );
                cb();
              });
          });
      } else return cb(); // Already up-to-date
    })
    .catch(cb);
});

gulp.task('download-signatures', cb => {
  got(
    'https://www.4byte.directory/api/v1/signatures/?page_size=20000&ordering=created_at',
    {
      json: true
    }
  )
    .then(res => {
      if (res.statusCode !== 200) {
        throw new Error(res.statusText);
      }

      const signatures = {};

      _.each(res.body.results, e => {
        signatures[e.hex_signature] = signatures[e.hex_signature] || [];
        signatures[e.hex_signature].push(e.text_signature);
      });

      fs.writeFileSync(
        'interface/client/lib/signatures.js',
        `window.SIGNATURES = ${JSON.stringify(signatures, null, 4)};`
      );

      cb();
    })
    .catch(cb);
});

gulp.task('update-i18n', cb => {
  /**
   * This script will update Mist's i18n files
   *  - adds missing english strings to all translations
   *  - removes obsolet keys from translations
   */

  const mistEN = require('../interface/i18n/mist.en.i18n.json'); // eslint-disable-line no-unused-vars
  const appEN = require('../interface/i18n/app.en.i18n.json'); // eslint-disable-line no-unused-vars

  try {
    ['mist', 'app'].forEach(mode => {
      const en = {
        parent: 'en',
        content: eval(`${mode}EN`) // eslint-disable-line no-eval
      };

      const files = fs.readdirSync('./interface/i18n');

      files.forEach(file => {
        if (
          file.indexOf(`${mode}`) !== -1 &&
          file.indexOf(`${mode}.en`) === -1
        ) {
          const langJson = require(`../interface/i18n/${file}`); // eslint-disable-line import/no-dynamic-require
          const lang = {
            parent: 'lang',
            content: langJson
          };
          let error;

          // remove unnecessary keys
          error = compare([lang, en]);
          if (error) {
            error.forEach(diff => {
              if (diff.typeOfComparedParent === 'undefined') {
                eval(
                  `delete lang.content.${diff.parent.slice(
                    diff.parent.indexOf('.') + 1
                  )}`
                ); // eslint-disable-line no-eval
              }
            });
          }

          // add missing keys
          error = compare([en, lang]);
          if (error) {
            error.forEach(diff => {
              if (
                diff.typeOfComparedParent !== diff.typeOfParent &&
                diff.parent !== 'en.mist.applicationMenu.view.languages' &&
                diff.parent !== 'en.mist.applicationMenu.view.langCodes'
              ) {
                eval(
                  `lang.content.${diff.comparedParent.slice(
                    diff.comparedParent.indexOf('.') + 1
                  )} = en.content.${diff.parent.slice(
                    diff.parent.indexOf('.') + 1
                  )}`
                ); // eslint-disable-line no-eval
              }
            });
          }

          fs.writeFileSync(
            `./interface/i18n/${file}`,
            JSON.stringify(lang.content, null, 4)
          );
        }
      });
    });
  } catch (e) {
    console.log(e);
  } finally {
    cb(); // eslint-disable-line callback-return
  }
});
