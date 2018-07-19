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
    if (this.state.priority) {
      return (
        <div onClick={this.handleClick} className="fee-selector">
          <span className="fee-selector__btn">Priority Fee:</span> $0.36 USD
        </div>
      );
    }

    return (
      <div onClick={this.handleClick} className="fee-selector">
        <span className="fee-selector__btn">Standard Fee:</span> $0.18 USD
      </div>
    );
  }
}

export default FeeSelector;
