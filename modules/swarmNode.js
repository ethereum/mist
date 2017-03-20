const Swarm = require("swarm-js");
const fsp = require("fs-promise");
const Q = require("bluebird");
const Settings = require("./settings.js");

class SwarmNode {
    constructor() {
        this._swarm = null;
        this._stop = null;
    }

    init() {
        console.log("Starting Swarm node.");
        return new Q((resolve, reject) => {
            // Start local node
            if (Settings.swarmURL === "http://localhost:8500") {
                console.log("Starting local Swarm node.");
                // TODO: use user account
                const config = {
                    account: 'd849168d52ea5c40de1b0b973cfd96873c961963',
                    password: 'sap',
                    dataDir: process.env.HOME + '/Library/Ethereum/testnet',
                    ethApi: process.env.HOME + '/Library/Ethereum/testnet/geth.ipc'
                }
                return Swarm.local(config)(swarm => new Q((stop) => {
                    console.log("Local Swarm node started.");
                    this._stop = stop;
                    this._swarm = swarm;
                    resolve(this);
                }));

            // Use a gatewway
            } else {
                console.log("Using Swarm gateway: "+Settings.swarmURL);
                this._swarm = Swarm.at(Settings.swarmURL);
                this._stop = () => {};
                resolve(this);
            }
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
        if (!this._swarm)
            return Q.reject(new Error('Swarm not initialized. Did you call swarmNode.init()?'));

        return this._swarm.upload(pathOrContents, defaultFile);
    }

}

module.exports = new SwarmNode();
