/**
Template Controllers

@module Templates
*/

/**
Update the peercount

@method getPeerCount
*/
var getPeerCount = function(template) {
  web3.eth.net.getPeerCount(function(error, result) {
    if (!error) {
      TemplateVar.set(template, 'peerCount', result);
    }
  });
};

/**
Update the mining hashrate

@method getMining
*/
var getMining = function(template) {
  web3.eth.isMining(function(e, res) {
    if (!e && res) {
      web3.eth.getHashrate(function(e, res) {
        if (!e) {
          TemplateVar.set(
            template,
            'mining',
            numeral(res / 1000).format('0,0.0')
          );
        }
      });
    } else {
      TemplateVar.set(template, 'mining', false);
    }
  });
};

/**
Set TemplateVar 'remote' whether remote node is active

@method watchRemote
*/
var watchRemote = function(template) {
  const isRemote = store.getState().nodes.active === 'remote';
  TemplateVar.set(template, 'remote', isRemote);

  let currentValue;
  this.storeUnsubscribe = store.subscribe(() => {
    let previousValue = currentValue;
    currentValue = store.getState().nodes.active;

    if (previousValue !== currentValue) {
      const isRemote = currentValue === 'remote';
      TemplateVar.set(template, 'remote', isRemote);
    }
  });
};

/**
The main template

@class [template] elements_nodeInfo
@constructor
*/

Template['elements_nodeInfo'].onCreated(function() {
  var template = this;

  // CHECK FOR NETWORK
  this.checkNetwork = function() {
    web3.eth.getBlock(0).then(block => {
      const network = Helpers.detectNetwork(block.hash);
      console.log('DETECT', block.hash)
      console.log(network);
      TemplateVar.set(template, 'network', network.type);
      TemplateVar.set(template, 'networkName', network.name);
    }).catch(error => {
      this.checkNetwork();
    });
  }
  this.checkNetwork();

  // CHECK SYNCING
  this.checkSync = function() {
    web3.eth.isSyncing(function(error, syncing) {
      console.log('isSyncing: ', syncing);

      if (error) {
        console.log(`Node isSyncing error: ${error}`);
        return;
      }

      if (syncing === true) {
        console.log('Node started syncing');
      } else if (_.isObject(syncing)) {
        syncing.progress = Math.floor(
          (syncing.currentBlock - syncing.startingBlock) /
            (syncing.highestBlock - syncing.startingBlock) *
            100
        );

        syncing.blockDiff = numeral(
          syncing.highestBlock - syncing.currentBlock
        ).format('0,0');

        TemplateVar.set(template, 'syncing', syncing);
      } else {
        TemplateVar.set(template, 'syncing', false);
      }
    });
  };
  this.checkSyncInterval = setInterval(() => { this.checkSync(); }, 3000);

  // CHECK PEER COUNT
  this.peerCountIntervalId = null;

  TemplateVar.set('peerCount', 0);
  getPeerCount(template);

  Meteor.clearInterval(this.peerCountIntervalId);
  this.peerCountIntervalId = setInterval(function() {
    getPeerCount(template);
  }, 3000);

  // CHECK MINING and HASHRATE
  this.miningIntervalId = null;

  TemplateVar.set('mining', false);
  getMining(template);

  // CHECK REMOTE
  watchRemote(template);

  Meteor.clearInterval(this.miningIntervalId);
  this.miningIntervalId = setInterval(function() {
    getMining(template);
  }, 3000);
});

Template['elements_nodeInfo'].onDestroyed(function() {
  Meteor.clearInterval(this.peerCountIntervalId);

  Meteor.clearInterval(this.checkSyncInterval);

  if (this.storeUnsubscribe) {
    this.storeUnsubscribe();
  }
});

Template['elements_nodeInfo'].helpers({
  /**
    Formats the last block number

    @method (formattedBlockNumber)
    @return {String}
    */
  formattedBlockNumber: function() {
    return numeral(EthBlocks.latest.number).format('0,0');
  },
  /**
    Formats the time since the last block

    @method (timeSinceBlock)
    */
  timeSinceBlock: function() {
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
      return (
        ' <span class="blue">' +
        TAPi18n.__('mist.nodeInfo.blockReceivedShort') +
        '</span>'
      );
    }

    Helpers.rerun['1s'].tick();
    return diff + 's';
  }
});
