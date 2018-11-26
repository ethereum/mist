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
      : new BigNumber(value || 0);
    const etherAmount = theValue
      .dividedBy(new BigNumber('1000000000000000000'))
      .toFixed();
    return etherAmount;
  };

  toBigNumber = v => {
    const value = v || 0;
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
    if (tx.networkId === 1 && etherPriceUSD) {
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

    return (
      <div>
        <div>
          {i18n.t('mist.txHistory.txHash')}:{' '}
          <span className="bold">{txHashLink}</span>
        </div>
        <div>
          {i18n.t('mist.txHistory.etherAmount')}:{' '}
          <span className="bold">{etherAmount} Ether</span>{' '}
          {etherAmountUSD && <span> (${etherAmountUSD} USD)</span>}
        </div>
        <div>
          {i18n.t('mist.txHistory.nonce')}:{' '}
          <span className="bold">{web3.utils.hexToNumberString(tx.nonce)}</span>
        </div>
        <div>
          {i18n.t('mist.txHistory.gasLimit')}:{' '}
          <span className="bold">{web3.utils.hexToNumberString(tx.gas)}</span>
        </div>
        {tx.gasUsed && (
          <div>
            {i18n.t('mist.txHistory.gasUsed')}:{' '}
            <span className="bold">
              {web3.utils.hexToNumberString(tx.gasUsed)}
            </span>
          </div>
        )}
        <div>
          {i18n.t('mist.txHistory.gasPrice')}:{' '}
          <span className="bold">{gasPriceEther} Ether</span> ({gasPriceGwei}{' '}
          Gwei)
        </div>
        {txCostEther && (
          <div>
            {i18n.t('mist.txHistory.txCost')}:{' '}
            <span className="bold">{txCostEther} Ether</span>
            {txCostUSD && <span> (${txCostUSD} USD)</span>}
          </div>
        )}
        {tx.data && (
          <div>
            {i18n.t('mist.txHistory.data')}:{' '}
            <span className="bold tx-data">{tx.data}</span>
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
      let executionFunctionSentence =
        tx.executionFunction.charAt(0).toUpperCase() +
        tx.executionFunction
          .slice(1, tx.executionFunction.indexOf('('))
          .replace(/([A-Z]+|[0-9]+)/g, ' $1');

      description = 'Executed  “' + executionFunctionSentence + '” function';
    } else {
      const etherAmount = this.valueToEtherAmount(tx.value);
      description = `Sent ${etherAmount} Ether`;
    }

    let status = (
      <span className="bold" style={{ color: 'grey' }}>
        {i18n.t('mist.txHistory.statusPending')}
      </span>
    );
    if (tx.status === 0) {
      status = (
        <span className="bold" style={{ color: 'red' }}>
          {i18n.t('mist.txHistory.statusFailed')}
        </span>
      );
    } else if (tx.status === 1 && tx.blockNumber) {
      const blockNumber = _.max([
        this.props.nodes.local.blockNumber,
        this.props.nodes.remote.blockNumber
      ]);
      const numberConfirmations = blockNumber - tx.blockNumber;
      status = (
        <span>
          <span className="bold" style={{ color: 'green' }}>
            {i18n.t('mist.txHistory.statusConfirmed')}
          </span>{' '}
          <span>
            ({i18n.t('mist.txHistory.confirmations', {
              count: numberConfirmations
            })})
          </span>
        </span>
      );
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
            {i18n.t('mist.txHistory.newContract')}:
            <DappIdenticon identity={tx.contractAddress} size="small" />
            <span className="bold">{tx.contractAddress}</span>
          </div>
        )}
        <div>
          {i18n.t('mist.txHistory.from')}:
          <DappIdenticon identity={tx.from} size="small" />
          <span className="bold">{tx.from}</span>
        </div>
        {isTokenTransfer && (
          <div>
            {i18n.t('mist.txHistory.to')}:
            <DappIdenticon identity={tokensTo} size="small" />
            <span className="bold">{tokensTo}</span>
          </div>
        )}
        {!isTokenTransfer && (
          <div>
            {tx.to && (
              <div>
                {i18n.t('mist.txHistory.to')}
                {tx.toIsContract && ' ' + i18n.t('mist.txHistory.contract')}:
                <DappIdenticon identity={tx.to} size="small" />
                <span className="bold">{tx.to}</span>
              </div>
            )}
          </div>
        )}
        <div>
          {i18n.t('mist.txHistory.status')}: {status}
        </div>
        {this.renderDetails()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(TxRow);
