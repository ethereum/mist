import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import StatusLight from './StatusLight';
import { setLocalPeerCount } from '../../actions.js';

class NodeInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showSubmenu: false,
      ticks: 0
    };
  }

  componentDidMount() {
    // NOTE: this component should give status updates at least once per second
    this.interval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  tick() {
    web3.eth.net.getPeerCount().then(peerCount => {
      this.props.dispatch(setLocalPeerCount(peerCount));
    });

    this.setState({ ticks: this.state.ticks + 1 });
  }

  renderRemoteStats() {
    // Hide remote stats if local node is synced
    if (this.props.active !== 'remote') {
      return null;
    }

    const formattedBlockNumber = numeral(this.props.remote.blockNumber).format(
      '0,0'
    );
    const remoteTimestamp = moment.unix(this.props.remote.timestamp);
    const diff = moment().diff(remoteTimestamp, 'seconds');

    if (this.props.remote.blockNumber < 1000) {
      // Still loading initial remote results
      return (
        <div id="remote-stats" className="node-info__section">
          <div className="node-info__node-title orange">
            <strong>Remote</strong> Node
          </div>
          <div>
            <div className="remote-loading row-icon">
              <i className="icon icon-energy" />
              {i18n.t('mist.nodeInfo.connecting')}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div id="remote-stats" className="node-info__section">
          <div className="node-info__node-title orange">
            <strong>Remote</strong> Node
            <span className="node-info__pill">
              {i18n.t('mist.nodeInfo.active')}
            </span>
          </div>
          <div className="block-number row-icon">
            <i className="icon icon-layers" /> {formattedBlockNumber}
          </div>
          {this.renderTimeSince(diff)}
        </div>
      );
    }
  }

  localStatsFindingPeers() {
    return (
      <div>
        <div className="looking-for-peers row-icon">
          <i className="icon icon-share" />
          {i18n.t('mist.nodeInfo.lookingForPeers')}
        </div>
      </div>
    );
  }

  localStatsStartSync() {
    return (
      <div>
        <div className="peer-count row-icon">
          <i className="icon icon-users" />
          {` ${this.props.local.peerCount} ${i18n.t('mist.nodeInfo.peers')}`}
        </div>
        <div className="sync-starting row-icon">
          <i className="icon icon-energy" />
          {i18n.t('mist.nodeInfo.syncStarting')}
        </div>
      </div>
    );
  }

  localStatsSyncProgress() {
    const { highestBlock, currentBlock, startingBlock } = this.props.local.sync;

    let displayBlock =
      this.props.local.sync.displayBlock || this.props.local.sync.startingBlock;
    displayBlock += (currentBlock - displayBlock) / 20;
    let formattedDisplayBlock = numeral(displayBlock).format('0,0');

    this.props.local.sync.displayBlock = displayBlock;

    const progress =
      ((displayBlock - startingBlock) / (highestBlock - startingBlock)) * 100;

    return (
      <div>
        <div className="block-number row-icon">
          <i className="icon icon-layers" />
          {formattedDisplayBlock}
        </div>
        <div className="peer-count row-icon">
          <i className="icon icon-users" />
          {` ${this.props.local.peerCount} ${i18n.t('mist.nodeInfo.peers')}`}
        </div>
        <div className="sync-progress row-icon">
          <i className="icon icon-cloud-download" />
          <progress max="100" value={progress || 0} />
        </div>
      </div>
    );
  }

  renderTimeSince(diff) {
    return (
      <div
        title={i18n.t('mist.nodeInfo.timeSinceBlock')}
        className={
          diff > 60 ? 'block-diff row-icon red' : 'block-diff row-icon'
        }
      >
        {
          // TODO: make this i8n compatible
        }
        <i className="icon icon-clock" />
        {diff < 120 ? diff + ' seconds' : Math.floor(diff / 60) + ' minutes'}
      </div>
    );
  }

  localStatsSynced() {
    const { blockNumber, timestamp, syncMode } = this.props.local;
    const formattedBlockNumber = numeral(blockNumber).format('0,0');

    const timeSince = moment(timestamp, 'X');
    const diff = moment().diff(timeSince, 'seconds');

    return (
      <div>
        <div
          className="block-number row-icon"
          title={i18n.t('mist.nodeInfo.blockNumber')}
        >
          <i className="icon icon-layers" /> {formattedBlockNumber}
        </div>
        {this.props.network !== 'private' && (
          <div className="peer-count row-icon">
            <i className="icon icon-users" />
            {` ${this.props.local.peerCount} ${i18n.t('mist.nodeInfo.peers')}`}
          </div>
        )}
        {this.renderTimeSince(diff)}
      </div>
    );
  }

  renderLocalStats() {
    const { syncMode } = this.props.local;
    const { currentBlock } = this.props.local.sync;

    let syncText;
    if (syncMode) {
      syncText = syncMode === 'nosync' ? `sync off` : `${syncMode} sync`;
    }

    let localStats;

    // TODO: potentially refactor local node status into Redux;
    // possible states: findingPeers, starting, synced, synced, disabled/nosync

    // Determine 'status' of local node, then show appropriate lens on sync data
    if (syncMode === 'nosync') {
      // Case: no local node
      return null;
    } else if (this.props.active === 'local') {
      // Case: already synced up
      localStats = this.localStatsSynced();
    } else if (this.props.active === 'remote') {
      // Case: not yet synced up
      if (currentBlock === 0) {
        // Case: no results from syncing
        if (this.props.local.peerCount === 0) {
          // Case: no peers yet
          localStats = this.localStatsFindingPeers();
        } else {
          // Case: connected to peers, but no blocks yet
          localStats = this.localStatsStartSync();
        }
      } else {
        // Case: show progress
        localStats = this.localStatsSyncProgress();
      }
    }

    return (
      <div id="local-stats" className="node-info__section">
        <div className="node-info__node-title local">
          <strong>{i18n.t('mist.nodeInfo.local')}</strong>{' '}
          {i18n.t('mist.nodeInfo.node')}
          {syncText && <span className="node-info__pill">{syncText}</span>}
        </div>

        {localStats}
      </div>
    );
  }

  render() {
    const { active, network, remote, local } = this.props;

    let mainClass = network == 'main' ? 'node-mainnet' : 'node-testnet';
    if (this.state.sticky) mainClass += ' sticky';

    return (
      <div
        id="node-info"
        className={mainClass}
        onMouseUp={() => this.setState({ sticky: !this.state.sticky })}
        onMouseEnter={() => this.setState({ showSubmenu: true })}
        onMouseLeave={() => this.setState({ showSubmenu: this.state.sticky })}
      >
        <StatusLight
          active={active}
          network={network}
          remote={remote}
          local={local}
        />

        {this.state.showSubmenu && (
          <section className="node-info__submenu-container">
            <section>
              <div className="node-info__section">
                <div className="node-info__network-title">{network}</div>
                <div className="node-info__subtitle">
                  {network !== 'main' && i18n.t('mist.nodeInfo.testNetwork')}
                  {network === 'main' && i18n.t('mist.nodeInfo.network')}
                </div>
              </div>

              {this.renderRemoteStats()}

              {this.renderLocalStats()}
            </section>
          </section>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    active: state.nodes.active,
    network: state.nodes.network,
    remote: state.nodes.remote,
    local: state.nodes.local
  };
}

export default connect(mapStateToProps)(NodeInfo);
