/**
Template Controllers

@module Templates
*/

/**
Update the peercount

@method getPeerCount
*/
var getPeerCount = function(template) {
    web3.net.getPeerCount(function(e, res) {
        if(!e)
            TemplateVar.set(template, 'peerCount', res);
    });
};

/**
Update the mining hashrate

@method getMining
*/
var getMining = function(template) {
    web3.eth.getMining(function(e, res) {
        if(!e && res) {
            web3.eth.getHashrate(function(e, res) {
                if(!e) {
                    TemplateVar.set(template, 'mining', numeral(res/1000).format('0,0.0'));
                }
            });
        } else {
            TemplateVar.set(template, 'mining', false);
        }
    });
};

/**
The main template

@class [template] elements_nodeInfo
@constructor
*/

Template['elements_nodeInfo'].onCreated(function(){
    var template = this;

    // CHECK FOR NETWORK
    web3.eth.getBlock(0, function(e, res){
        if(!e){
            const network = Helpers.detectNetwork(res.hash);
            TemplateVar.set(template, 'network', network.type);
            TemplateVar.set(template, 'networkName', network.name);
        }
    });

    // CHECK SYNCING
    this.syncFilter = web3.eth.isSyncing(function(error, syncing) {
        if(!error) {

            if(syncing === true) {
                console.log('Node started syncing, stopping app operation');
                web3.reset(true);

            } else if(_.isObject(syncing)) {

                syncing.progress = Math.floor(((syncing.currentBlock - syncing.startingBlock) / (syncing.highestBlock - syncing.startingBlock)) * 100);
                syncing.blockDiff = numeral(syncing.highestBlock - syncing.currentBlock).format('0,0');

                TemplateVar.set(template, 'syncing', syncing);

            } else {
                console.log('Restart app operation again');

                TemplateVar.set(template, 'syncing', false);
            }
        }
    });


    // CHECK PEER COUNT
    this.peerCountIntervalId = null;

    TemplateVar.set('peerCount', 0);
    getPeerCount(template);

    Meteor.clearInterval(this.peerCountIntervalId);
    this.peerCountIntervalId = setInterval(function() {
        getPeerCount(template);
    }, 1000);

    // CHECK MINING and HASHRATE
    this.miningIntervalId = null;

    TemplateVar.set('mining', false);
    getMining(template);

    Meteor.clearInterval(this.miningIntervalId);
    this.miningIntervalId = setInterval(function() {
        getMining(template);
    }, 1000);
});


Template['elements_nodeInfo'].onDestroyed(function() {
    Meteor.clearInterval(this.peerCountIntervalId);

    if (this.syncFilter) {
        this.syncFilter.stopWatching();
    }
});


Template['elements_nodeInfo'].helpers({
    /**
    Formats the last block number

    @method (formattedBlockNumber)
    @return {String}
    */
    formattedBlockNumber: function () {
        return numeral(EthBlocks.latest.number).format('0,0');
    },
    /**
    Formats the time since the last block

    @method (timeSinceBlock)
    */
    timeSinceBlock: function () {
        var timeSince = moment(EthBlocks.latest.timestamp, 'X');
        var now = moment();
        var diff = now.diff(timeSince, 'seconds');

        if (!EthBlocks.latest.timestamp) {
            return '-';
        }

        if (diff > 60) {
            Helpers.rerun['10s'].tick();
            return timeSince.fromNow(true);
        } else if (diff < 2) {
            Helpers.rerun['1s'].tick();
            return ' <span class="blue">' + TAPi18n.__('mist.nodeInfo.blockReceivedShort') + '</span>';
        }

        Helpers.rerun['1s'].tick();
        return diff + 's';
    }
});
