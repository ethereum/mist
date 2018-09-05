import React, { Component } from 'react';
import MDSpinner from 'react-md-spinner';

class FeeSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ticks: 1
    };

    this.formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  }

  componentDidMount() {
    this.interval = setInterval(this.tick, 1000);
  }

  tick = () => {
    const { gasPrice, gasLoading } = this.props;

    // every 10 seconds fetch gas details again if still loading

    // TODO: also check for estimate values
    if (this.state.ticks % 10 === 0 && (gasLoading || gasPrice === 0)) {
      this.props.getGasPrice();
      this.props.getGasUsage();
    }

    this.setState({ ticks: this.state.ticks + 1 });
  };

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  handleClick = () => {
    this.props.togglePriority();
  };

  parseFee() {
    const { estimatedGas, gasPrice, network, etherPriceUSD } = this.props;

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

    return fee;
  }

  render() {
    return (
      <div className="fee-selector">
        {this.props.priority ? (
          <span
            onClick={this.handleClick}
            className="fee-selector__btn"
            data-tooltip="Click For Standard Fee"
          >
            {i18n.t('mist.sendTx.priorityFee')}
          </span>
        ) : (
          <span
            onClick={this.handleClick}
            className="fee-selector__btn"
            data-tooltip="Click For Priority Fee"
          >
            {i18n.t('mist.sendTx.standardFee')}
          </span>
        )}{' '}
        <span className="fee-amount">{this.parseFee()}</span>
        {this.props.gasLoading && (
          <MDSpinner
            singleColor="#00aafa"
            size={16}
            className="react-spinner"
          />
        )}
        {this.props.gasLoading &&
          this.state.ticks >= 10 && (
            <div className="fee-selector__error">
              This is taking a while! You may choose to use this default fee if
              you don't want to wait. Your actual fee will likely not be this
              high.
            </div>
          )}
      </div>
    );
  }
}

export default FeeSelector;
