const _ = require('underscore');
const Q = require('bluebird');
const fs = require('fs');
const githubUpload = Q.promisify(require('gh-release-assets'));
const got = require('got');
const gulp = require('gulp');
const options = require('../gulpfile.js').options;
const path = require('path');
const shell = require('shelljs');
const version = require('../package.json').version;


const checksums = [];
const type = options.type;


gulp.task('checksums', (cb) => {
    const releasePath = `./dist_${type}/release`;
    const files = fs.readdirSync(releasePath);

    let command;
    let argument = '';

    switch (process.platform) {
    case 'darwin':
        command = 'md5';
        break;
    case 'win32':
        command = 'certUtil -hashfile';
        argument = 'md5';
        break;
    default:
        command = 'md5sum';
    }

    files.forEach((file) => {
        const sum = shell.exec(`${command} "${file}" ${argument}`, {
            cwd: releasePath
        });

        if (sum.code !== 0) {
            Error(`Error executing shasum: ${sum.stderr}`);
        }

        // store checksums for 'upload-binaries' task
        checksums.push(sum.stdout);
    });

    cb();
});


gulp.task('upload-binaries', (cb) => {
    // if CI detected only upload if on master branch
    if (process.env.CI && process.env.TRAVIS_BRANCH !== 'master') return;

    // personal access token (public_repo) must be set using travis' ENVs
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    // query github releases
    got(`https://api.github.com/repos/ethereum/mist/releases?access_token=${GITHUB_TOKEN}`, { json: true })
    // filter draft with current version's tag
    .then((res) => {
        const draft = res.body[_.indexOf(_.pluck(res.body, 'tag_name'), `v${version}`)];

        if (draft === undefined) throw new Error(`Couldn't find github release draft for v${version} release tag`);

        return draft;
    })
    // upload binaries from release folders if in draft mode
    .then((draft) => {  // eslint-disable-line consistent-return
        if (draft.draft === true) {
            const dir = `dist_${type}/release`;
            const files = fs.readdirSync(dir);
            const filePaths = _.map(files, (file) => { return path.join(dir, file); });

            // check if draft already contains target binaries
            // note: github replaces spaces in filenames with dots
            const existingAssets = _.intersection(files.map((file) => { return file.replace(/\s/g, '.'); }), _.pluck(draft.assets, 'name'));
            if (!_.isEmpty(existingAssets)) throw new Error(`Github release draft already contains assets (${existingAssets}); will not upload, please remove and trigger rebuild`);

            return githubUpload({
                url: `https://uploads.github.com/repos/ethereum/mist/releases/${draft.id}/assets{?name}`,
                token: [GITHUB_TOKEN],
                assets: filePaths
            }).then((res) => {
                console.log(`Successfully uploaded ${res} to v${version} release draft.`);
            })
            // append checksums to draft text
            .then(() => {
                if (draft.body && checksums) {
                    got.patch(`https://api.github.com/repos/ethereum/mist/releases/${draft.id}?access_token=${GITHUB_TOKEN}`, {
                        body: JSON.stringify({
                            body: `${draft.body}\n\n## Checksums\n\`\`\`\n${checksums.join('')}\`\`\``
                        })
                    });
                }
            });
        }
    })
    .catch((err) => {
        console.log(err);
    })
    .then(() => {
        cb();
    });
});
