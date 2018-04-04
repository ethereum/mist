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
var watchRemote = template => {
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
Subscribe to syncing events and start/stop polling for status

@method startSyncSubscription
*/
var startSyncSubscription = template => {
  this.syncSubscription = web3.eth
    .subscribe('syncing', (error, sync) => {
      if (error) {
        console.log(`Node sync subscription error: ${error}`);
        // Try to restart subscription
        setTimeout(() => {
          startSyncSubscription(template);
        }, 1000);
        // Clear sync checking interval
        Meteor.clearInterval(this.syncIntervalId);
        return;
      }
    })
    .on('data', sync => {
      updateSync(sync, template);
    })
    .on('changed', isSyncing => {
      TemplateVar.set(template, 'syncing', isSyncing);

      Meteor.clearInterval(this.syncIntervalId);

      if (isSyncing) {
        this.syncIntervalId = setInterval(() => {
          checkSync(template);
        }, 1500);
      }
    });
};

/**
Get syncing status and update template

@method updateSync
*/
var checkSync = template => {
  web3.eth.isSyncing().then(sync => {
    updateSync(sync, template);
  });
};

/**
Update template with syncing status

@method updateSync
*/
var updateSync = (sync, template) => {
  if (!_.isObject(sync)) {
    return;
  }

  sync.progress = Math.floor(
    (sync.currentBlock - sync.startingBlock) /
      (sync.highestBlock - sync.startingBlock) *
      100
  );

  sync.blockDiff = numeral(sync.highestBlock - sync.currentBlock).format('0,0');

  TemplateVar.set(template, 'syncing', sync);
};

/**
Check network and set TemplateVars

@method checkNetwork
*/
var checkNetwork = template => {
  web3.eth
    .getBlock(0)
    .then(block => {
      const network = Helpers.detectNetwork(block.hash);
      TemplateVar.set(template, 'network', network.type);
      TemplateVar.set(template, 'networkName', network.name);
    })
    .catch(error => {
      checkNetwork(template);
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
  checkNetwork(template);

  // CHECK SYNCING
  startSyncSubscription(template);

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

  if (this.syncSubscription) {
    this.syncSubscription.unsubscribe();
  }

  Meteor.clearInterval(this.syncIntervalId);

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
