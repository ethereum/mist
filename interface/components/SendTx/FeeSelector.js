import React, { Component } from 'react';

class FeeSelector extends Component {
  constructor(props) {
    super(props);

    this.formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });

    // Gas price timeout: now + 15 seconds
    // Retry interval: 15 seconds
    this.gasPriceTimeout = new Date().getTime() + 15000;
    this.secondsLeftUntilRetry = 15;
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      if (new Date().getTime() > this.gasPriceTimeout) {
        const timeElapsed = (
          (new Date().getTime() - this.gasPriceTimeout) /
          1000
        ).toFixed(0);
        this.secondsLeftUntilRetry = 15 - timeElapsed;
      }
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  handleClick = () => {
    this.props.togglePriority();
  };

  render() {
    const { estimatedGas, gasPrice, network, etherPriceUSD } = this.props;

    if (!estimatedGas) {
      return <div>{i18n.t('mist.sendTx.loading')}</div>;
    }

    if (!gasPrice || gasPrice === 0 || gasPrice === '0x0') {
      if (this.gasPriceTimeout > new Date().getTime()) {
        return <div>{i18n.t('mist.sendTx.loading')}</div>;
      } else {
        if (this.secondsLeftUntilRetry <= 0) {
          this.props.getGasPrice();
          this.gasPriceTimeout = new Date().getTime() + 15000;
          return <div>{i18n.t('mist.sendTx.loading')}</div>;
        } else {
          return (
            <div style={{ color: 'red', fontWeight: 'bold' }}>
              {i18n.t('mist.sendTx.gasPriceError', {
                seconds: this.secondsLeftUntilRetry
              })}
            </div>
          );
        }
      }
    }

    const gas = web3.utils.isHex(estimatedGas)
      ? new BigNumber(web3.utils.hexToNumberString(estimatedGas))
      : new BigNumber(estimatedGas);
    const bigGasPrice = web3.utils.isHex(gasPrice)
      ? new BigNumber(web3.utils.hexToNumberString(gasPrice))
      : new BigNumber(gasPrice);
    const gasEtherAmount = gas
      .times(bigGasPrice)
      .dividedBy(new BigNumber('1000000000000000000'));
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
