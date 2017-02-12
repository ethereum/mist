// NODE ABOUT ACCOUNTS
// 
// There is currently no account management system.
// The following account type is used here:
//
// type Account = {
//     name: String,
//     address: String,
//     permissions: ???, // TODO
//     type: "swarm" | "whishper" | "user",
//     password: String
// }
//
// TODO: implement a proper account management system.
// TODO: logging

const db = require('./db.js');
const got = require("got");
const path = require('path');
const spawn = require("child_process").spawn;
const Settings = require('./settings');
const EventEmitter = require('events').EventEmitter;

// Swarm requires an Ethereum account to work. Since that account has no money
// in it, it's security isn't important and thus we use a default password.
// Note this account must under no circumstances be exposed to the user.
const ACCOUNT_PASSWORD = "swarmAccountPassword";

// Swarm startup timeout
const STARTUP_TIMEOUT_MS = 10000;

// Process stdout hooks to react accordingly
const HOOKS = {
  PASSWORD_PROMPT: "Passphrase",
  LISTENING: "Swarm HTTP proxy started"
}

// Process startup status
const STATES = {
  WAITING_PASSWORD: 0,
  STARTING: 1,
  LISTENING: 2
}

// Swarm might possibly be already running on this URL
const SWARM_URL = "http://localhost:8500";

class SwarmNode extends EventEmitter {

    constructor() {
        super();
        this.process = null;
    }

    /**
     * This method should always be called first to initialize the connection.
     *
     * @return {Promise SwarmNode}
     */
    init(ethereumNode) {
        // TODO: check if Swarm is already running
        // Perhaps sending a request to http://localhost:8500 ?
        // got(SWARM_URL, {timeout: 1500})
        //   .then((res) => {})
        //   .catch(err => {});

        return this.getAccount(ethereumNode).then(this.startProcess.bind(this));
    }

    /**
     * Returns the account used by Swarm.
     *
     * @return {Promise Account}
     */
    getAccount(ethereumNode) {
        // Get swarm account from DB
        const accounts = db.getCollection("UI_accounts");
        const swarmAccounts = accounts.find({"type": "swarm"});

        // If it is there, return and resolve
        if (swarmAccounts.length > 0)
            return new Promise(resolve => resolve(swarmAccounts[0]));

        // If it is not there, create it
        return ethereumNode
            .send("personal_newAccount", [ACCOUNT_PASSWORD])
            .then(addressResponse => {
                const swarmAccount = {
                    "name": "swarmAccount",
                    "address": addressResponse.result,
                    "permissions": [],
                    "type": "swarm",
                    "password": ACCOUNT_PASSWORD
                };
                accounts.insert(swarmAccount);
                return swarmAccount;
            })
    }

    /**
      * Starts the Swarm process.
      * 
      * @return {Promise SwarmNode}
      */
    startProcess(account) {
      return new Promise((resolve, reject) => {

        // Start Swarm process
        const swarmPath = path.join(Settings.userDataPath, "binaries", "Geth", "unpacked", "swarm");
        const swarmProc = spawn(swarmPath, [
          "--bzzaccount", account.address,
          "--datadir", path.join(Settings.rpcIpcPath, ".."),
          "--ethapi", Settings.rpcIpcPath]);
        this.process = swarmProc;

        // Process status
        var swarmProcStatus = STATES.WAITING_PASSWORD;

        // Handle Swarm process's stdout
        function handleProcessOutput(data){
          switch (swarmProcStatus) {

          // Initially, we must type the password
          case STATES.WAITING_PASSWORD:
            if ((""+data).indexOf(HOOKS.PASSWORD_PROMPT) !== -1){
              setTimeout(() => {
                swarmProc.stdin.write(ACCOUNT_PASSWORD+"\n");
                swarmProcStatus = STATES.STARTING;
              }, 500);
            }
          break;

          // We then resolve the Promise when the process laods
          case STATES.STARTING:
            if ((""+data).indexOf(HOOKS.LISTENING) !== -1) {
              swarmProcStatus = STATES.LISTENING;
              resolve(this);
            }
          break;
          }
        };
        swarmProc.stdout.on("data", handleProcessOutput);
        swarmProc.stderr.on("data", handleProcessOutput);

        // TODO: handle close
        swarmProc.on("close", (code) => {
        });

        // If Swarm doesn't start after some time, reject
        setTimeout(() => {
          reject(new Error("Couldn't start Swarm."));
        }, STARTUP_TIMEOUT_MS);
          
      });
    }

    /**
     * Stop process.
     *
     * TODO:
     *   This is almost identical to `ethereumNode.stop`.
     *   Maybe we could avoid this code repetition by   
     *   having a class to deal with spawning?
     * 
     * @return {Promise}
     */
    stop() {
        return new Promise((resolve, reject) => {

            if (!this.process)
                return resolve();

            log.info(`Stopping existing node: ${this._type} ${this._network}`);

            this.process.stderr.removeAllListeners('data');
            this.process.stdout.removeAllListeners('data');
            this.process.stdin.removeAllListeners('error');
            this.process.removeAllListeners('error');
            this.process.removeAllListeners('exit');

            this.process.kill('SIGINT');

            // after some time just kill it if not already done so
            const killTimeout = setTimeout(() => {
                if (this.process) {
                    this.process.kill('SIGKILL');
                }
            }, 8000 /* 8 seconds */);

            this.process.once('close', () => {
                clearTimeout(killTimeout);

                this.process = null;

                resolve();
            });
        });
    }

}

module.exports = new SwarmNode();
