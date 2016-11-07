/**
The dechunker module gets IPC buffers and tries to decode them.

@module dechunker
*/

const _ = require('underscore');

let lastChunk = null;
let lastChunkTimeout = null;

/**
The dechunker module gets IPC buffers and tries to decode them.

@method dechunker
*/
module.exports = function (data, callback) {
    data = data.toString();

    // DE-CHUNKER
    const dechunkedData = data
        .replace(/\}[\n\r]?\{/g, '}|--|{') // }{
        .replace(/\}\][\n\r]?\[\{/g, '}]|--|[{') // }][{
        .replace(/\}[\n\r]?\[\{/g, '}|--|[{') // }[{
        .replace(/\}\][\n\r]?\{/g, '}]|--|{') // }]{
        .split('|--|');


    _.each(dechunkedData, (data) => {
        // prepend the last chunk
        if (lastChunk)
            { data = lastChunk + data; }

        let result = data;

        try {
            result = JSON.parse(result);
        } catch (e) {
            lastChunk = data;

            // start timeout to cancel all requests
            clearTimeout(lastChunkTimeout);
            lastChunkTimeout = setTimeout(() => {
                callback(`Couldn't decode data: ${data}`);
            }, 1000 * 15);

            return;
        }

        // cancel timeout and set chunk to null
        clearTimeout(lastChunkTimeout);
        lastChunk = null;

        callback(null, result);
    });
};
