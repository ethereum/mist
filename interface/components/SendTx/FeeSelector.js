import React, { Component } from 'react';

class FeeSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      priority: false
    };
  }

  handleClick = () => {
    this.setState({ priority: !this.state.priority });
  };

  render() {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });

    const gasEtherAmount = new web3.utils.BN(this.props.estimatedGas).div(
      new web3.utils.BN(1000000000)
    );

    let fee;
    if (this.state.priority) {
      if (this.props.network === 'main') {
        const gasEtherAmountPriority = gasEtherAmount.mul(new web3.utils.BN(2));
        const priorityFee = gasEtherAmount.mul(
          new web3.utils.BN(this.props.priceUSD)
        );
        const formattedFee = formatter.format(priorityFee);
        fee = `${formattedFee} USD`;
      } else {
        fee = `${gasEtherAmountPriority} ETH`;
      }
    } else {
      if (this.props.network === 'main') {
        const standardFee = gasEtherAmount.mul(
          new web3.utils.BN(this.props.priceUSD)
        );
        const formattedFee = formatter.format(standardFee);
        fee = `${formattedFee} USD`;
      } else {
        fee = `${gasEtherAmount} ETH`;
      }
    }

    if (this.state.priority) {
      return (
        <div className="fee-selector">
          <span
            onClick={this.handleClick}
            className="fee-selector__btn"
            data-tooltip="Click For Standard Fee"
          >
            Priority Fee:
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
          Standard Fee:
        </span>{' '}
        <span className="fee-amount">{fee}</span>
      </div>
    );
  }
}

export default FeeSelector;
