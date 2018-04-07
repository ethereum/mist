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
    this.interval = setInterval(this.tick, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  tick = () => {
    web3.eth.net.getPeerCount((error, result) => {
      if (!error) {
        this.setState({ peerCount: result });
      }
    });

    this.setState({ timestamp: this.state.timestamp + 1 });
  };

  renderRemoteStats() {
    // Hide remote stats if local node is synced
    if (this.props.active !== 'remote') {
      return null;
    }

    const formattedBlockNumber = numeral(this.props.remote.blockNumber).format('0,0');
    const remoteTimestamp = moment.unix(this.props.remote.timestamp);
    const diff = moment().diff(remoteTimestamp, 'seconds');

    if (this.props.remote.blockNumber === 100) {
      // Still loading initial remote results
      return (
        <div id="remote-stats" className="node-info__section">
          <div>Loading...</div>
        </div>
      );
    } else {
      return (
        <div id="remote-stats" className="node-info__section">
          <div className="node-info__node-title orange">
            REMOTE <span className="node-info__pill">active</span>
          </div>
          <div>
            <i className="icon-layers" /> {formattedBlockNumber}
          </div>
          <div>
            <i className="icon-clock" /> {diff} seconds
          </div>
        </div>
      );
    }
  }

  renderLocalStats() {
    const { blockNumber, timestamp, syncMode } = this.props.local;
    const { highestBlock, currentBlock, startingBlock } = this.props.local.sync;

    const blocksBehind = numeral(highestBlock - currentBlock).format('0,0');
    const progress =
      (currentBlock - startingBlock) / (highestBlock - startingBlock) * 100;

    const formattedBlockNumber = numeral(blockNumber).format('0,0');
    const timeSince = moment(this.props.local.timestamp, 'X');
    const diff = moment().diff(timeSince, 'seconds');

    let localStats;

    if (this.props.active === 'remote') {
      // While syncing, localStats displays progress
      localStats = (
        <div>
          <div className="block-number">
            <i className="icon-layers" /> {blocksBehind || '—'} blocks behind
          </div>
          <div>
            <i className="icon-users" /> {this.state.peerCount} peers
          </div>
          <div>
            <i className="icon-cloud-download" />
            <progress max="100" value={progress || 0} />
          </div>
        </div>
      );
    } else {
      // When synced, localStats displays latest block data
      localStats = (
        <div>
          <div className="block-number">
            <i className="icon-layers" /> {formattedBlockNumber}
          </div>
          <div>
            <i className="icon-users" /> {this.state.peerCount} peers
          </div>
          <div>
            <i className="icon-clock" /> {diff} seconds
          </div>
        </div>
      );
    }

    return (
      <div id="local-stats" className="node-info__section">
        <div className="node-info__node-title">
          LOCAL
          <span className="node-info__pill">{syncMode} sync</span>
        </div>

        {localStats}
      </div>
    );
  }

  render() {
    const { active, network } = this.props;

    return (
      <div id="node-info">
        <div
          id="node-info__light"
          style={{
            backgroundColor: active === 'remote' ? 'orange' : '#24C33A'
          }}
          onMouseEnter={() =>
            this.setState({ showSubmenu: !this.state.showSubmenu })
          }
        />

        {this.state.showSubmenu && (
          <section className="node-info__submenu-container">
            <section>
              <div className="node-info__section">
                <div className="node-info__subtitle">Network</div>
                <div className="node-info__network-title">{network}</div>
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
