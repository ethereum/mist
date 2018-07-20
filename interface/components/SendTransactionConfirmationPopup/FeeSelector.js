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
    const standardFee =
      this.props.priceUSD * (this.props.estimatedGas / 1000000000);
    const formattedStandardFee = formatter.format(standardFee);

    // TODO: priority calculation
    const priorityFee = standardFee * 2;
    const formattedPriorityFee = formatter.format(priorityFee);

    if (this.state.priority) {
      return (
        <div className="fee-selector">
          <span onClick={this.handleClick} className="fee-selector__btn">
            Priority Fee:
          </span>{' '}
          {formattedPriorityFee} USD
        </div>
      );
    }

    return (
      <div className="fee-selector">
        <span onClick={this.handleClick} className="fee-selector__btn">
          Standard Fee:
        </span>{' '}
        {formattedStandardFee} USD
      </div>
    );
  }
}

export default FeeSelector;
