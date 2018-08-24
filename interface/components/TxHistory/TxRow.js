import React, { Component } from 'react';
import { connect } from 'react-redux';
import DappIdenticon from '../DappIdenticon';

class TxRow extends Component {
  constructor(props) {
    super(props);

    this.state = { showDetails: false };
  }

  valueToEtherAmount = value => {
    const theValue = web3.utils.isHex(value)
      ? new BigNumber(web3.utils.hexToNumberString(value))
      : new BigNumber(tx.value);
    const etherAmount = theValue
      .dividedBy(new BigNumber('1000000000000000000'))
      .toFixed();
    return etherAmount;
  };

  toBigNumber = value => {
    return web3.utils.isHex(value)
      ? new BigNumber(web3.utils.hexToNumberString(value))
      : new BigNumber(value);
  };

  toggleDetails() {
    this.setState({ showDetails: !this.state.showDetails });
  }

  renderDetails() {
    const { tx, etherPriceUSD } = this.props;

    if (!this.state.showDetails) {
      return (
        <div className="tx-moreDetails" onClick={() => this.toggleDetails()}>
          Show details
        </div>
      );
    }

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

    const etherAmount = this.valueToEtherAmount(tx.value);
    let etherAmountUSD;
    if (tx.networkId === 1) {
      etherAmountUSD = this.toBigNumber(etherAmount)
        .times(new BigNumber(etherPriceUSD))
        .toFixed(2);
    }
    const gasPriceEther = this.valueToEtherAmount(tx.gasPrice);
    const gasPriceGwei = new BigNumber(gasPriceEther)
      .times(new BigNumber('1000000000'))
      .toFixed();
    let txCostEther;
    let txCostUSD;
    if (tx.blockNumber) {
      const txCost = this.toBigNumber(tx.gasUsed)
        .times(this.toBigNumber(tx.gasPrice))
        .toFixed();
      txCostEther = this.valueToEtherAmount(txCost);
      if (tx.networkId === 1 && etherPriceUSD > 0) {
        txCostUSD = this.toBigNumber(txCostEther)
          .times(new BigNumber(etherPriceUSD))
          .toFixed(2);
      }
    }

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
          <span style={{ color: 'green' }}>Confirmed</span>{' '}
          <span style={{ fontWeight: 'normal' }}>
            ({numberConfirmations} confirmations)
          </span>
        </span>
      );
    }

    return (
      <div>
        <div>
          Status: <span className="bold">{status}</span>
        </div>
        <div>
          Transaction Hash: <span className="bold">{txHashLink}</span>
        </div>
        <div>
          Ether Amount: <span className="bold">{etherAmount} ether</span>{' '}
          {etherAmountUSD && <span> (${etherAmountUSD} USD)</span>}
        </div>
        <div>
          Nonce:{' '}
          <span className="bold">{web3.utils.hexToNumberString(tx.nonce)}</span>
        </div>
        <div>
          Gas Limit:{' '}
          <span className="bold">{web3.utils.hexToNumberString(tx.gas)}</span>
        </div>
        {tx.gasUsed && (
          <div>
            Gas Used:{' '}
            <span className="bold">
              {web3.utils.hexToNumberString(tx.gasUsed)}
            </span>
          </div>
        )}
        <div>
          Gas Price: <span className="bold">{gasPriceEther} ether</span> ({
            gasPriceGwei
          }{' '}
          Gwei)
        </div>
        {txCostEther && (
          <div>
            Actual transaction cost:{' '}
            <span className="bold">{txCostEther} ether</span>
            {txCostUSD && <span> (${txCostUSD} USD)</span>}
          </div>
        )}
        {tx.data && (
          <div>
            Data: <span className="bold">{tx.data}</span>
          </div>
        )}
        <div className="tx-moreDetails" onClick={() => this.toggleDetails()}>
          Hide details
        </div>
      </div>
    );
  }

  render() {
    const tx = this.props.tx;
    const networkString = this.props.networkString(tx.networkId);
    let network = '';
    if (networkString !== 'Main') {
      network = networkString;
    }
    const isTokenTransfer =
      tx.executionFunction === 'transfer(address,uint256)';
    let description;
    let tokensTo;
    if (isTokenTransfer) {
      const decimals = tx.token.decimals;
      const tokenCount = tx.params[1].value.slice(0, -Math.abs(decimals));
      const tokenSymbol = this.props.token.symbol || 'tokens';
      description = `Transferred ${tokenCount} ${tokenSymbol}`;
      tokensTo = tx.params[0].value;
    } else if (tx.isNewContract) {
      description = 'Created New Contract';
    } else if (tx.executionFunction) {
      description = 'Executed Contract Function';
    } else {
      const etherAmount = this.valueToEtherAmount(tx.value);
      description = `Sent ${etherAmount} ether`;
    }

    return (
      <div key={tx.hash || tx.nonce} className="tx">
        <div className="right">
          {network && <div className="network">{network}</div>}
          <div className="tx-date">{tx.createdAt}</div>
        </div>
        <div className="tx-description">{description}</div>
        {tx.contractAddress && (
          <div>
            New Contract:
            <DappIdenticon identity={tx.contractAddress} size="small" />
            <span className="bold">{tx.contractAddress}</span>
          </div>
        )}
        <div>
          From:
          <DappIdenticon identity={tx.from} size="small" />
          <span className="bold">{tx.from}</span>
        </div>
        {isTokenTransfer && (
          <div>
            To:
            <DappIdenticon identity={tokensTo} size="small" />
            <span className="bold">{tokensTo}</span>
          </div>
        )}
        {!isTokenTransfer && (
          <div>
            {tx.to && (
              <div>
                To{tx.toIsContract && ' Contract'}:
                <DappIdenticon identity={tx.to} size="small" />
                <span className="bold">{tx.to}</span>
              </div>
            )}
          </div>
        )}
        {this.renderDetails()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(TxRow);
