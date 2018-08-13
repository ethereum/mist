import React, { Component } from 'react';
import { connect } from 'react-redux';
import {} from '../../actions.js';
import DappIdenticon from '../DappIdenticon';
import { updateTx } from '../../actions.js';

class ListTxs extends Component {
  constructor(props) {
    super(props);

    this.state = { showDetails: [], newBlockSub: null };
    this.newBlockSub = null;
  }

  componentDidMount() {
    this.updatePendingTxs();
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
          this.props.dispatch(updateTx(txReceipt));
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

  handleDetailsClick = index => {
    if (this.state.showDetails.includes(index)) {
      const showDetails = this.state.showDetails;
      const theIndex = showDetails.indexOf(index);
      showDetails.splice(theIndex, 1);
      this.setState({ showDetails });
    } else {
      this.setState({ showDetails: [...this.state.showDetails, index] });
    }
  };

  renderMoreDetails(index) {
    const tx = this.props.txs[index];

    if (!this.state.showDetails.includes(index)) {
      return (
        <div
          className="tx-moreDetails"
          onClick={() => this.handleDetailsClick(index)}
        >
          More details
        </div>
      );
    }

    return (
      <div>
        <div>
          Nonce:{' '}
          <span className="bold">{web3.utils.hexToNumberString(tx.nonce)}</span>
        </div>
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
        {tx.gasUsed && (
          <div>
            Gas Used:{' '}
            <span className="bold">
              {web3.utils.hexToNumberString(tx.gasUsed)}
            </span>
          </div>
        )}
        {tx.data && (
          <div>
            Data: <span className="bold">{tx.data}</span>
          </div>
        )}
        <div
          className="tx-moreDetails"
          onClick={() => this.handleDetailsClick(index)}
        >
          Less details
        </div>
      </div>
    );
  }

  render() {
    const txs = this.props.txs;

    const txList = txs.map((tx, index) => {
      let txHashLink = 'Unavailable';
      if (tx.hash) {
        let subdomain = '';
        if (tx.networkId === 3) {
          subdomain = 'ropsten.';
        } else if (tx.networkId === 4) {
          subdomain = 'rinkeby.';
        } else if (tx.networkId === 42) {
          subdomain = 'kovan.';
        }
        txHashLink = (
          <a
            href={`https://${subdomain}etherscan.io/tx/${tx.hash}`}
            target="_blank"
          >
            {tx.hash}
          </a>
        );
      }

      const etherAmount =
        web3.utils.toBN(tx.value).toNumber() / 1000000000000000000;

      let status = <span style={{ color: 'grey' }}>Pending</span>;
      if (tx.status === 0) {
        status = <span style={{ color: 'red' }}>Failed</span>;
      } else if (tx.status === 1 && tx.blockNumber) {
        const blockNumber = _.max([
          this.props.nodes.local.blockNumber,
          this.props.nodes.remote.blockNumber
        ]);
        const numberConfirmations = blockNumber - tx.blockNumber;
        status = (
          <span>
            <span style={{ color: 'green' }}>Confirmed</span> ({
              numberConfirmations
            }{' '}
            confirmations)
          </span>
        );
      }

      return (
        <div key={tx.hash || tx.nonce} className="tx">
          <div>
            Network:{' '}
            <span className="bold">{this.networkString(tx.networkId)}</span>
          </div>
          <div>
            Status: <span className="bold">{status}</span>
          </div>
          <div>
            Transaction Hash: <span className="bold">{txHashLink}</span>
          </div>
          <div>
            From:
            <DappIdenticon identity={tx.from} size="small" />
            <span className="bold">{tx.from}</span>
          </div>
          {tx.to && (
            <div>
              To {tx.toIsContract && 'Contract'}:
              <DappIdenticon identity={tx.to} size="small" />
              <span className="bold">{tx.to}</span>
            </div>
          )}
          {tx.contractAddress && (
            <div>
              Created Contract:
              <DappIdenticon identity={tx.contractAddress} size="small" />
              <span className="bold">{tx.contractAddress}</span>
            </div>
          )}
          <div>
            Ether Amount: <span className="bold">{etherAmount}</span>
          </div>
          <div>
            Created At: <span className="bold">{tx.createdAt}</span>
          </div>
          {this.renderMoreDetails(index)}
        </div>
      );
    });

    return (
      <div className="popup-windows list-txs">
        <div className="header">
          <h1>Transaction History</h1>
          {txs.length > 0 && <h2>{txs.length} total</h2>}
        </div>
        <div className="tx-list">
          {txList}
          {txs.length === 0 && (
            <div className="no-txs">No transactions yet.</div>
          )}
        </div>}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(ListTxs);
