import React, { Component } from 'react';
import { connect } from 'react-redux';
import DappIdenticon from '../DappIdenticon';
import { updateTx, getPriceConversion } from '../../actions';
import TxRow from './TxRow';

class TxHistory extends Component {
  constructor(props) {
    super(props);

    this.state = { showDetails: [], newBlockSub: null };
    this.newBlockSub = null;
  }

  componentDidMount() {
    this.updatePendingTxs();
    this.props.dispatch(getPriceConversion());
  }

  compenntDidUnmount() {
    this.unsub();
  }

  unsub() {
    if (!this.newBlockSub) {
      return;
    }

    this.newBlockSub.unsubscribe(() => {
      this.newBlockSub = null;
    });
  }

  updatePendingTxs() {
    this.unsub();
    const updateTxs = () => {
      const txs = this.props.txs;
      _.each(txs, (tx, index) => {
        // Return if we don't have a tx hash to check for receipt
        if (!tx.hash) {
          return;
        }

        // Return if tx is on different network
        const currentNetwork = this.props.nodes.network.toLowerCase();
        const txNetwork = this.networkString(tx.networkId).toLowerCase();
        if (txNetwork !== currentNetwork) {
          return;
        }

        // Return if tx has already been successful
        if (tx.blockNumber) {
          return;
        }

        web3.eth.getTransactionReceipt(tx.hash).then(txReceipt => {
          if (txReceipt.blockNumber) {
            this.props.dispatch(updateTx(txReceipt));
          }
        });
      });
    };
    updateTxs();
    this.newBlockSub = web3.eth.subscribe('newBlockHeaders', () => {
      updateTxs();
    });
  }

  networkString(networkId) {
    switch (networkId) {
      case 1:
        return 'Main';
      case 3:
        return 'Ropsten';
      case 4:
        return 'Rinkeby';
      case 42:
        return 'Kovan';
      default:
        return 'Unknown';
    }
  }

  render() {
    const txs = this.props.txs;

    const txList = txs.map(tx => {
      return (
        <TxRow
          tx={tx}
          key={tx.hash}
          networkString={this.networkString}
          etherPriceUSD={this.props.settings.etherPriceUSD}
        />
      );
    });

    return (
      <div className="list-txs">
        <div className="header">
          <h1>
            {i18n.t('mist.txHistory.windowTitle')}
            {txs.length > 0 && (
              <span>
                {' '}
                (<span className="txs-total">
                  {i18n.t('mist.txHistory.total', { count: txs.length })}
                </span>)
              </span>
            )}
          </h1>
        </div>
        <div className="tx-list">
          {txList}
          {txs.length === 0 && (
            <div className="no-txs">No transactions yet.</div>
          )}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(TxHistory);
