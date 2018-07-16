import React, { Component } from 'react';
import Data from './Data';
import Fees from './Fees';

class ExecutionContext extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="execution-context">
        <div>Coming Soon!</div>

        <Data
          data={this.props.data}
          showFormattedParams={this.props.showFormattedParams}
        />

        <Fees
          estimatedGas={this.props.estimatedGas}
          gasLoading={this.props.gasLoading}
          estimatedFee={this.props.estimatedFee}
          providedGas={this.props.providedGas}
        />
      </div>
    );
  }
}

export default ExecutionContext;
