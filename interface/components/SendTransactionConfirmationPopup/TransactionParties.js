import React, { Component } from 'react';
import DappIdenticon from '../DappIdenticon';

class TransactionParties extends Component {
  shortenAddress = address => {
    if (_.isString(address)) {
      return address.substr(0, 6) + '...' + address.substr(-4);
    }
  };

  totalAmount = () => {
    var amount = EthTools.formatBalance(
      web3.utils.toBN(this.props.value || 0),
      '0,0.00[0000000000000000]',
      'ether'
    );

    var dotPos = ~amount.indexOf('.')
      ? amount.indexOf('.') + 3
      : amount.indexOf(',') + 3;

    if (amount) {
      return (
        <span>
          {amount.substr(0, dotPos)}{' '}
          <small style={{ fontSize: '0.5em' }}>{amount.substr(dotPos)}</small>
        </span>
      );
    }

    return '0';
  };

  renderSendDestination() {
    const { to, toIsContract } = this.props;

    if (to) {
      return (
        <div>
          {toIsContract ? (
            <i className="overlap-icon icon-doc" />
          ) : (
            <i className="overlap-icon icon-key" />
          )}
          <DappIdenticon identity={to.toLowerCase()} size="large" />
          <br />
          <a
            href={`http://etherscan.io/address/${to}#code`}
            className="simptip-position-bottom simptip-movable"
            data-tooltip={to}
            target="_blank"
          >
            {this.shortenAddress(to)}
          </a>
        </div>
      );
    }

    return (
      <div>
        <i className="circle-icon icon-doc" />
        <br />
        <span>
          {i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.createContract'
          )}
        </span>
      </div>
    );
  }

  render() {
    const {
      from,
      fromIsContract,
      executionFunction,
      hasSignature
    } = this.props;

    return (
      <div className="transaction-parties">
        <div>
          {fromIsContract ? (
            <i className="overlap-icon icon-doc" />
          ) : (
            <i className="overlap-icon icon-key" />
          )}
          <DappIdenticon
            identity={from.toLowerCase()}
            className="dapp-identicon dapp-large"
          />
          <br />
          <span
            className="simptip-position-bottom simptip-movable"
            data-tooltip={from}
          >
            {this.shortenAddress(from)}
          </span>
        </div>

        <div className="connection">
          <div className="amount">
            {this.totalAmount()} <span className="unit">ETHER</span>
            {executionFunction ? (
              <div
                className={`function-signature ${
                  hasSignature ? 'has-signature' : ''
                }`}
              >
                {executionFunction}
              </div>
            ) : (
              ''
            )}
          </div>
        </div>

        {this.renderSendDestination()}
      </div>
    );
  }
}

export default TransactionParties;
