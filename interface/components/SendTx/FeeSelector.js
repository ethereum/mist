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

    // TODO: BigNumber math
    const gasEtherAmount = this.props.estimatedGas / 1000000000;
    const standardFee = this.props.priceUSD * gasEtherAmount;
    const formattedStandardFee = formatter.format(standardFee);

    // TODO: priority calculation
    const priorityFee = standardFee * 2;
    const formattedPriorityFee = formatter.format(priorityFee);

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
          <span className="fee-amount">
            {this.props.network === 'main'
              ? `${formattedPriorityFee} USD`
              : `${gasEtherAmount * 2} ETH`}
          </span>
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
        <span className="fee-amount">
          {this.props.network === 'main'
            ? `${formattedStandardFee} USD`
            : `${gasEtherAmount} ETH`}
        </span>
      </div>
    );
  }
}

export default FeeSelector;
