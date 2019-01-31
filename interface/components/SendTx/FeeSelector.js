import React, { Component } from 'react';
import MDSpinner from 'react-md-spinner';

class FeeSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ticks: 1,
      gasRetries: 0
    };

    this.formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  }

  componentDidMount() {
    this.interval = setInterval(this.monitorGas, 1000);
  }

  monitorGas = () => {
    const { gasPriceGweiStandard, gasLoading } = this.props;
    const { ticks, gasRetries } = this.state;

    // Retry every 20 sec if appropriate
    if (
      ticks % 20 === 0 &&
      (gasLoading || gasPriceGweiStandard === 0) &&
      gasRetries < 3
    ) {
      this.props.getGasPrice();
      this.props.getGasUsage();
      this.setState({ gasRetries: gasRetries + 1 });
    }

    this.setState({ ticks: ticks + 1 });
  };

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  handleClick = () => {
    this.props.togglePriority();
  };

  parseFee() {
    const {
      estimatedGas,
      gasPriceGweiStandard,
      gasPriceGweiPriority,
      network,
      etherPriceUSD
    } = this.props;

    if (!this.props.priority) {
      const priceInWei = new BigNumber(gasPriceGweiStandard).times(1000000000);
      const etherFee = priceInWei
        .times(estimatedGas)
        .dividedBy(new BigNumber('1000000000000000000'));

      if (network.toLowerCase() === 'main' && etherPriceUSD) {
        const standardFee = etherFee.times(etherPriceUSD);
        const formattedFee = this.formatter.format(standardFee);
        return `${formattedFee} USD (${etherFee} ETH)`;
      } else {
        return `${etherFee} ETH`;
      }
    }

    const priceInWeiPriority = new BigNumber(gasPriceGweiPriority).times(
      1000000000
    );
    const etherFee = priceInWeiPriority
      .times(estimatedGas)
      .dividedBy(new BigNumber('1000000000000000000'));

    if (network.toLowerCase() === 'main' && etherPriceUSD) {
      const standardFee = etherFee.times(etherPriceUSD);
      const formattedFee = this.formatter.format(standardFee);
      return `${formattedFee} USD (${etherFee} ETH)`;
    } else {
      return `${etherFee} ETH`;
    }
  }

  renderStatus() {
    const { gasLoading } = this.props;
    const { gasRetries, ticks } = this.state;

    const spinner =
      gasLoading && gasRetries !== 5 ? (
        <MDSpinner singleColor="#00aafa" size={16} className="react-spinner" />
      ) : null;

    let error;

    if (this.props.gasLoading && ticks >= 10 && gasRetries < 5) {
      error = (
        <div className="fee-selector__error">
          {i18n.t('mist.sendTx.gasLoadingWarning')}
        </div>
      );
    } else if (this.props.gasLoading && gasRetries === 5) {
      error = (
        <div className="fee-selector__error">
          {i18n.t('mist.sendTx.gasLoadingError')}
        </div>
      );
    }

    return (
      <React.Fragment>
        {spinner}
        {error}
      </React.Fragment>
    );
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
        {this.renderStatus()}
      </div>
    );
  }
}

export default FeeSelector;
