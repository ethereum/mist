import React, { Component } from 'react';
import DappIdenticon from '../DappIdenticon';

// TODO: "TO" when sending ETH, otherwise "CONTRACT"

class TransactionParties extends Component {
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

  renderFrom() {
    const { from, fromIsContract } = this.props;

    return (
      <div className="tx-parties__party">
        <DappIdenticon identity={from.toLowerCase()} size="small" />
        <div className="tx-parties__direction-name">FROM</div>
        <div>
          <span className="bold">{from}</span>
        </div>
      </div>
    );
  }

  renderTo() {
    const { to, toIsContract, isNewContract } = this.props;

    if (isNewContract) {
      return null;
    }

    if (to) {
      return (
        <div className="tx-parties__party">
          <DappIdenticon identity={to.toLowerCase()} size="small" />
          <div className="tx-parties__direction-name">
            {toIsContract ? 'CONTRACT' : 'TO'}
          </div>
          <a href={`http://etherscan.io/address/${to}#code`} target="_blank">
            <span className="bold">{to}</span>
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

  renderConnection() {
    const { executionFunction, hasSignature } = this.props;

    return (
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
    );
  }

  render() {
    return (
      <div className="tx-parties">
        {this.renderFrom()}
        {this.renderTo()}
      </div>
    );
  }
}

export default TransactionParties;
