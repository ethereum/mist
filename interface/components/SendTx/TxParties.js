import React, { Component } from 'react';
import DappIdenticon from '../DappIdenticon';

class TxParties extends Component {
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
    const { from, toIsContract, isNewContract, executionFunction } = this.props;

    return (
      <div className="tx-parties__party">
        <DappIdenticon identity={from.toLowerCase()} size="small" />
        <div
          className={
            'tx-parties__direction-name ' +
            (toIsContract &&
            !isNewContract &&
            executionFunction !== 'transfer(address,uint256)'
              ? 'is-contract'
              : '')
          }
        >
          {i18n.t('mist.sendTx.from')}
        </div>
        <div>
          <span className="tx-parties__address bold">{from}</span>
        </div>
      </div>
    );
  }

  renderTo() {
    const {
      to,
      toIsContract,
      isNewContract,
      executionFunction,
      params
    } = this.props;

    if (isNewContract) {
      return null;
    }

    // If token transfer, render `to` as the address the tokens are being transferred to
    if (executionFunction === 'transfer(address,uint256)') {
      if (params[0] && params[0].value) {
        const address = params[0].value;
        return (
          <div className="tx-parties__party">
            <DappIdenticon identity={address.toLowerCase()} size="small" />
            <div className="tx-parties__direction-name">
              {i18n.t('mist.sendTx.to')}
            </div>
            <span className="tx-parties__address bold">{address}</span>
          </div>
        );
      }
    }

    if (to) {
      return (
        <div className="tx-parties__party">
          <DappIdenticon identity={to.toLowerCase()} size="small" />
          <div
            className={
              'tx-parties__direction-name ' +
              (toIsContract ? 'is-contract' : '')
            }
          >
            {toIsContract
              ? i18n.t('mist.sendTx.contract')
              : i18n.t('mist.sendTx.to')}
          </div>
          <span className="tx-parties__address bold">{to}</span>
        </div>
      );
    }

    return null;
  }

  renderConnection() {
    const { executionFunction, hasSignature } = this.props;

    return (
      <div className="connection">
        <div className="amount">
          {this.totalAmount()} <span className="unit">ETHER</span>
          {executionFunction && (
            <div
              className={`function-signature ${
                hasSignature ? 'has-signature' : ''
              }`}
            >
              {executionFunction}
            </div>
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

export default TxParties;
