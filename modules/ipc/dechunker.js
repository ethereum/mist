/**
The dechunker module gets IPC buffers and tries to decode them.

@module dechunker
*/

const _ = require('underscore');


/**
The dechunker module gets IPC buffers and tries to decode them.

@method dechunker
*/
module.exports = class Dechunker {
    constructor() {
        this.lastChunk = null;
        this.lastChunkTimeout = null;
    }

    dechunk(data, callback) {
        data = data.toString();

        // DE-CHUNKER
        const dechunkedData = data
            .replace(/\][\n\r]?/g, ']') // ]
            .replace(/\}[\n\r]?/g, '}') // }
            .replace(/\}[\n\r]?\{/g, '}|--|{') // }{
            .replace(/\}\][\n\r]?\[\{/g, '}]|--|[{') // }][{
            .replace(/\}[\n\r]?\[\{/g, '}|--|[{') // }[{
            .replace(/\}\][\n\r]?\{/g, '}]|--|{') // }]{
            .split('|--|');


        // if it couldn't be split, return error
        if (!_.isArray(dechunkedData)) {
            return callback(`Couldn't split data: ${data}`);
        }

        return _.each(dechunkedData, (data) => {
            // prepend the last chunk
            if (this.lastChunk)
                { data = this.lastChunk + data; }

            let result = data;

            try {
                result = JSON.parse(result);
            } catch (e) {
                this.lastChunk = data;

                // start timeout to cancel all requests
                clearTimeout(this.lastChunkTimeout);
                this.lastChunkTimeout = setTimeout(() => {
                    callback(`Couldn't decode data: ${data}`);
                }, 1000 * 15);

                return;
            }

            // cancel timeout and set chunk to null
            clearTimeout(this.lastChunkTimeout);
            this.lastChunkTimeout = null;
            this.lastChunk = null;

            callback(null, result);
        });
    }
};
