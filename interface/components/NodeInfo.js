import React, { Component } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';

class NodeInfo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showSubmenu: false,
      peerCount: 0,
      timestamp: Date.now()
    };
  }

  componentDidMount() {
    // NOTE: this goal of this component is to give status updates at
    // least once per second. The `tick` function ensures that.
    this.interval = setInterval(() => {
      this.tick();
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  tick() {
    web3.eth.net.getPeerCount().then(peerCount => {
      this.setState({ peerCount });
    });

    this.setState({ timestamp: this.state.timestamp + 1 });
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
          <div>Loading...</div>
        </div>
      );
    } else {
      return (
        <div id="remote-stats" className="node-info__section">
          <div className="node-info__node-title orange">
            <strong>Remote</strong> Node<span className="node-info__pill">
              active
            </span>
          </div>
          <div className="block-number row-icon">
            <i className="icon icon-layers" /> {formattedBlockNumber}
          </div>
          <div className="block-diff row-icon">
            <i className="icon icon-clock" /> {diff} seconds
          </div>
        </div>
      );
    }
  }

  renderLocalStats() {
    const { blockNumber, timestamp, syncMode } = this.props.local;
    const { highestBlock, currentBlock, startingBlock } = this.props.local.sync;

    const blocksBehind =
      highestBlock - currentBlock > 0
        ? numeral(highestBlock - currentBlock).format('0,0')
        : '-';
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
        localStats = <div>Looking for peers...</div>;
      } else {
        localStats = <div>Sync starting...</div>;
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
    const { active, network, local } = this.props;

    const timeSince = moment(parseInt(local.timestamp), 'X');
    const breatheSpeed =
      Math.floor(moment().diff(timeSince, 'seconds') / 5) + 's';

    const mainClass = network == 'main' ? 'node-mainnet' : 'node-testnet';

    return (
      <div
        id="node-info"
        className={mainClass}
        onMouseEnter={() => this.setState({ showSubmenu: true })}
        onMouseLeave={() => this.setState({ showSubmenu: false })}
      >
        <div
          id="node-info__light"
          style={{
            animationDuration: breatheSpeed,
            backgroundColor: active === 'remote' ? 'orange' : '#24C33A'
          }}
        />

        {this.state.showSubmenu && (
          <section className="node-info__submenu-container">
            <section>
              <div className="node-info__section">
                <div className="node-info__network-title">{network}</div>
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
