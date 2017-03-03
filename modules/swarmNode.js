const Swarm = require('swarm-js');
const fsp = require("fs-promise");
const Q = require("bluebird");

class SwarmNode {
    constructor(swarmURL) {
        this.swarm = null;
    }

    // TODO: start node if swarmURL is null
    init(swarmURL) {
        return new Q((resolve, reject) => {
            this.swarm = Swarm.at(swarmURL);
            resolve(this);
        });
    }

    /**
     * Uploads data to Swarm netork.
     * If pathOrContents is a buffer, uploads it.
     * If it is an object mapping paths to buffers, uploads that directory.
     * If it is a string, uploads the file/directory at that path.
     * In that case, defaultFile can be set to define the directory root.
     *
     * @param  {(Buffer|Object|String)} pathOrContents
     * @param  {String} [defaultFile]
     * @return {Promise String}
     */
    upload(pathOrContents, defaultFile) {
        if (!this.swarm)
            Q.reject(new Error("Swarm not initialized. Did you call .init()?"));

        // Upload raw data (buffer)
        if (pathOrContents instanceof Buffer) {
            return this.swarm.uploadData(pathOrContents);

        // Upload JSON
        } else if (pathOrContents instanceof Object) {
            return this.swarm.uploadDirectory(pathOrContents);

        // Upload directory/file from disk
        } else if (typeof pathOrContents === "string") {
            const path = dirPathOrContents;
            return fsp.lstat(path).then(stat => {
                if (stat.isDirectory()) {
                    return defaultFile 
                        ? this.swarm.uploadDirectoryFromDiskWithDefaultPath(path, defaultFile)
                        : this.swarm.uploadDirectoryFromDisk(path);
                } else {
                    return this.swarm.uploadFileFromDisk(path);
                }
            });
        }

        return Q.reject(new Error("Bad arguments"));
    }

}

module.exports = new SwarmNode();
