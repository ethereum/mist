import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';

class NodeInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showSubmenu: false,
      peerCount: 0,
      ticks: 0
    };
  }

  componentDidMount() {
    // NOTE: this goal of this component is to give status updates at
    // least once per second. The `tick` function ensures that.
    this.interval = setInterval(() => {
      this.tick();
    }, 50);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  tick() {
    if (this.state.ticks % 20 == 0) {
      // only do it every second
      web3.eth.net.getPeerCount().then(peerCount => {
        this.setState({ peerCount });
      });
    }

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
              <i className="icon icon-energy" /> Connecting...
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div id="remote-stats" className="node-info__section">
          <div className="node-info__node-title orange">
            <strong>Remote</strong> Node
            <span className="node-info__pill">active</span>
          </div>
          <div className="block-number row-icon">
            <i className="icon icon-layers" /> {formattedBlockNumber}
          </div>
          <div
            className={
              diff > 60 ? 'block-diff row-icon red' : 'block-diff row-icon'
            }
          >
            {
              // TODO: make this i8n compatible
            }
            <i className="icon icon-clock" />{' '}
            {diff < 120
              ? diff + ' seconds'
              : Math.floor(diff / 60) + ' minutes'}
          </div>
        </div>
      );
    }
  }

  renderLocalStats() {
    const { blockNumber, timestamp, syncMode } = this.props.local;
    const { highestBlock, currentBlock, startingBlock } = this.props.local.sync;

    let displayBlock =
      this.props.local.sync.displayBlock || this.props.local.sync.startingBlock;
    displayBlock += (currentBlock - displayBlock) / 20;

    const blocksBehind =
      highestBlock - currentBlock > 0
        ? numeral(highestBlock - displayBlock).format('0,0')
        : '-';

    this.props.local.sync.displayBlock = displayBlock;

    const progress =
      (currentBlock - startingBlock) / (highestBlock - startingBlock) * 100;

    const formattedBlockNumber = numeral(blockNumber).format('0,0');
    const timeSince = moment(this.props.local.timestamp, 'X');
    const diff = moment().diff(timeSince, 'seconds');

    const syncText = syncMode === 'nosync' ? `sync off` : `${syncMode} sync`;

    let localStats;

    if (syncMode === 'nosync') {
      // No localStats if 'nosync'
    } else if (currentBlock === 0) {
      if (this.state.peerCount === 0) {
        localStats = (
          <div>
            <div className="looking-for-peers row-icon">
              <i className="icon icon-share" /> Looking for peers...
            </div>
          </div>
        );
      } else {
        localStats = (
          <div>
            <div className="peer-count row-icon">
              <i className="icon icon-users" /> {this.state.peerCount} peers
            </div>
            <div className="sync-starting row-icon">
              <i className="icon icon-energy" /> Sync starting...
            </div>
          </div>
        );
      }
    } else if (this.props.active === 'remote') {
      // While syncing, localStats displays progress
      localStats = (
        <div>
          <div className="block-number row-icon">
            <i className="icon icon-layers" /> {blocksBehind} blocks behind
          </div>
          <div className="peer-count row-icon">
            <i className="icon icon-users" /> {this.state.peerCount} peers
          </div>
          <div className="sync-progress row-icon">
            <i className="icon icon-cloud-download" />
            <progress max="100" value={progress || 0} />
          </div>
        </div>
      );
    } else {
      // When synced, localStats displays latest block data
      localStats = (
        <div>
          <div className="block-number row-icon">
            <i className="icon-layers" /> {formattedBlockNumber}
          </div>
          <div className="peer-count row-icon">
            <i className="icon icon-users" /> {this.state.peerCount} peers
          </div>
          <div className="block-diff row-icon">
            <i className="icon icon-clock" /> {diff} seconds
          </div>
        </div>
      );
    }

    return (
      <div id="local-stats" className="node-info__section">
        <div className="node-info__node-title local">
          <strong>Local</strong> Node
          <span className="node-info__pill">{syncText}</span>
        </div>

        {localStats}
      </div>
    );
  }

  render() {
    const { active, network, remote } = this.props;

    const timeSince = moment(remote.timestamp, 'X');
    const diff = moment().diff(timeSince, 'seconds');

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
        <div
          id="node-info__light"
          title={diff}
          style={{
            backgroundColor:
              diff > 60 ? 'red' : active === 'remote' ? 'orange' : '#24C33A'
          }}
        />

        {this.state.showSubmenu && (
          <section className="node-info__submenu-container">
            <section>
              <div className="node-info__section">
                <div className="node-info__network-title">
                  {network}
                  {network != 'main' && (
                    <span className="node-info__pill">test</span>
                  )}
                </div>
                <div className="node-info__subtitle">Network</div>
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
