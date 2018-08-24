import React, { Component } from 'react';

class FeeSelector extends Component {
  constructor(props) {
    super(props);

    this.formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  }

  handleClick = () => {
    this.props.togglePriority();
  };

  render() {
    const { estimatedGas, network, etherPriceUSD } = this.props;

    if (!this.props.estimatedGas) {
      return <div>{i18n.t('mist.sendTx.loading')}</div>;
    }

    const gas = web3.utils.isHex(estimatedGas)
      ? new BigNumber(web3.utils.hexToNumberString(estimatedGas))
      : new BigNumber(estimatedGas);
    const gasEtherAmount = gas.dividedBy(1000000000);
    const gasEtherAmountPriority = gasEtherAmount.times(2);

    let fee;
    if (!this.props.priority) {
      if (network.toLowerCase() === 'main' && etherPriceUSD) {
        const standardFee = gasEtherAmount.times(etherPriceUSD);
        const formattedFee = this.formatter.format(standardFee);
        fee = `${formattedFee} USD`;
      } else {
        fee = `${gasEtherAmount} ETH`;
      }
    } else {
      if (network.toLowerCase() === 'main' && etherPriceUSD) {
        const priorityFee = gasEtherAmountPriority.times(etherPriceUSD);
        const formattedFee = this.formatter.format(priorityFee);
        fee = `${formattedFee} USD`;
      } else {
        fee = `${gasEtherAmountPriority} ETH`;
      }
    }

    if (this.props.priority) {
      return (
        <div className="fee-selector">
          <span
            onClick={this.handleClick}
            className="fee-selector__btn"
            data-tooltip="Click For Standard Fee"
          >
            {i18n.t('mist.sendTx.priorityFee')}
          </span>{' '}
          <span className="fee-amount">{fee}</span>
        </div>
      );
    }

    return (
      <div className="fee-selector">
        <span
          onClick={this.handleClick}
          className="fee-selector__btn"
          data-tooltip="Click For Priority Fee"
        >
          {i18n.t('mist.sendTx.standardFee')}
        </span>{' '}
        <span className="fee-amount">{fee}</span>
      </div>
    );
  }
}

export default FeeSelector;
