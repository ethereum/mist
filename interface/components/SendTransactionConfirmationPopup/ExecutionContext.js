import React, { Component } from 'react';
import Data from './Data';
import Fees from './Fees';

class ExecutionContext extends Component {
  constructor(props) {
    super(props);
  }

  formattedBalance() {
    return EthTools.formatBalance(
      web3.utils.toBN(this.props.value || 0),
      '0,0.00[0000000000000000]',
      'ether'
    );
  }

  renderExecutionSentence() {
    if (this.props.toIsContract) {
      return <div className="execution-context__sentence">Coming Soon!</div>;
    }

    let conversion;
    if (this.props.network === 'main') {
      conversion = <span>About {this.calculateTransferValue()} USD</span>;
    } else {
      conversion = (
        <span>
          $0 USD (<span className="capitalize">{this.props.network}</span>)
        </span>
      );
    }

    return (
      <div className="execution-context__sentence">
        Transfer <span className="bold">{this.formattedBalance()} ETHER</span>
        <div className="execution-context__transfer-price">{conversion}</div>
      </div>
    );
  }

  calculateTransferValue() {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });

    // TODO: BigNumber math
    const fee = this.props.priceUSD * (this.props.value / 1000000000000000000);
    return formatter.format(fee);
  }

  render() {
    return (
      <div className="execution-context">
        {this.renderExecutionSentence()}

        {this.props.toIsContract ? (
          <div className="execution-context__details-link">More details</div>
        ) : null}

        {/*
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
        */}
      </div>
    );
  }
}

export default ExecutionContext;
