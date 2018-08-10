import React, { Component } from 'react';
import { connect } from 'react-redux';
import {} from '../../actions.js';
import DappIdenticon from '../DappIdenticon';

class ListTxs extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {}

  render() {
    const txs = this.props.txs;

    const txList = txs.map(tx => {
      return (
        <div key={tx.hash || tx.nonce} className="tx">
          <div>
            From:
            <DappIdenticon identity={tx.from} size="small" />
            <span className="bold">{tx.from}</span>
          </div>
          {tx.to && (
            <div>
              To:
              <DappIdenticon identity={tx.to} size="small" />
              <span className="bold">{tx.to}</span>
            </div>
          )}
          <div>
            Gas:{' '}
            <span className="bold">{web3.utils.hexToNumberString(tx.gas)}</span>
          </div>
          <div>
            Gas Price:{' '}
            <span className="bold">
              {web3.utils.hexToNumberString(tx.gasPrice)}
            </span>
          </div>
          <div>
            Nonce:{' '}
            <span className="bold">
              {web3.utils.hexToNumberString(tx.nonce)}
            </span>
          </div>
          {tx.data && (
            <div>
              To: <span className="bold">{tx.data}</span>
            </div>
          )}
          <div>
            Value:{' '}
            <span className="bold">
              {web3.utils.hexToNumberString(tx.value)}
            </span>
          </div>
          {tx.hash && (
            <div>
              Transaction Hash: <span className="bold">{tx.hash}</span>
            </div>
          )}
        </div>
      );
    });

    return (
      <div className="popup-windows list-txs">
        <div className="header">
          <h1>Transaction History</h1>
          <h2>{txs.length} total</h2>
        </div>
        <div class="tx-list">{txList}</div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(ListTxs);
