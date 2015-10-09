/**
@module ethereumNodes
*/

const spawn = require('child_process').spawn;
const path = __dirname + '/../nodes';

module.exports = {
    /**
    Stop all running nodes.

    @method stopNodes
    */
    stopNodes: function() {
        // kill running geth
        if(global.nodes.geth) {
            global.nodes.geth.kill('SIGKILL');
            global.nodes.geth = null;
        }

        // kill running eth
        if(global.nodes.eth) {
            global.nodes.eth.kill('SIGKILL');
            global.nodes.eth = null;
        }
    },
    /**
    Start the geth node.

    @method startGeth
    */
    startGeth: function(testnet){
        console.log('Starting Geth...');

        var gethPath = path + '/geth/geth';

        if(global.production)
            gethPath = gethPath.replace('app.asar/','');

        if(process.platform === 'win32')
            gethPath += '.exe';

        if(process.platform === 'linux')
            gethPath = 'geth'; // simply try to run a global binary

        // start testnet
        if(testnet) {
            global.nodes.geth = spawn(gethPath, [
                '--testnet', '',
            ]);

        // start mainnet
        } else {
            global.nodes.geth = spawn(gethPath, []);
        }

        global.nodes.geth.on('error',function(){
            console.log('Couldn\'t start geth node!');
        });

        // type yes to the inital warning window
        setTimeout(function(){
            global.nodes.geth.stdin.write("y\r\n");
        }, 10);
        // global.nodes.geth.stdout.on('data', function(chunk) {
        //     console.log('stdout',String(chunk));
        // });
        // global.nodes.geth.stderr.on('data', function(chunk) {
        //     console.log('stderr',String(chunk));
        // });

        return global.nodes.geth;
    },
    /**
    Start the eth++ node.

    @method startEth
    */
    startEth: function(testnet){
        console.log('Starting Eth...');

        var ethPath = path + '/eth/eth';

        if(global.production)
            ethPath = ethPath.replace('app.asar/','');

        if(process.platform === 'win32')
            ethPath += '.exe';

        if(process.platform === 'linux')
            ethPath = 'eth'; // simply try to run a global binary

        // start testnet
        if(testnet) {
            global.nodes.eth = spawn(ethPath, [
                '--morden', ''
            ]);

        // start mainnet
        } else {
            global.nodes.eth = spawn(ethPath, [
                '--master', '""'
            ]);
        }

        global.nodes.eth.on('error',function(){
            console.log('Couldn\'t start eth node!');
        });


        return global.nodes.eth;
    }
};