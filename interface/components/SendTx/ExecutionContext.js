import React, { Component } from 'react';
import DappIdenticon from '../DappIdenticon';

class ExecutionContext extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showDetails: false
    };
  }

  formattedBalance() {
    return EthTools.formatBalance(
      web3.utils.toBN(this.props.value || 0),
      '0,0.00[0000000000000000]',
      'ether'
    );
  }

  shortenAddress(address) {
    if (_.isString(address)) {
      return address.substr(0, 6) + '...' + address.substr(-4);
    }
  }

  renderExecutionSentence() {
    if (this.props.isNewContract) {
      // TODO: accurate?
      const bytesCount = encodeURI(this.props.data).split(/%..|./).length - 1;

      return (
        <div className="execution-context__sentence">
          <div>
            Upload <span className="bold">New Contract</span>
          </div>
          <div className="execution-context__subtext">
            About {bytesCount} bytes
          </div>
        </div>
      );
    }

    if (this.props.toIsContract) {
      // Token transfers
      if (this.props.executionFunction === 'transfer(address,uint256)') {
        const decimals = this.props.token.decimals;
        const tokenCount = this.props.params[1].value.slice(
          0,
          -Math.abs(decimals)
        );
        const tokenSymbol = this.props.token.symbol || 'tokens';

        return (
          <div className="execution-context__sentence">
            Transfer{' '}
            <span className="bold">
              {tokenCount} {tokenSymbol}
            </span>
          </div>
        );
      }

      const params = this.props.executionFunction.match(/\((.+)\)/i);
      console.log('∆∆∆ params (in component)', params);

      // Unknown/generic function execution:
      return (
        <div className="execution-context__sentence">
          Executing a contract function
        </div>
      );
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
        <div>
          Transfer <span className="bold">{this.formattedBalance()} ETHER</span>
        </div>
        <div className="execution-context__subtext">{conversion}</div>
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

  handleDetailsClick = () => {
    this.setState({ showDetails: !this.state.showDetails }, () =>
      this.props.adjustWindowHeight()
    );
  };

  renderMoreDetails() {
    const {
      executionFunction,
      toIsContract,
      isNewContract,
      value,
      estimatedGas,
      token
    } = this.props;

    if (!toIsContract && !isNewContract) {
      return null;
    }

    const isTokenTransfer =
      this.props.executionFunction === 'transfer(address,uint256)';
    const showTxExecutingFunction = !isNewContract && !isTokenTransfer;
    let tokenDisplayName;
    if (isTokenTransfer) {
      if (token.name !== token.symbol) {
        tokenDisplayName = `${token.name} (${token.symbol})`;
      } else {
        tokenDisplayName = token.name;
      }
    }

    if (!this.state.showDetails) {
      return (
        <div
          className="execution-context__details-link"
          onClick={this.handleDetailsClick}
        >
          More details
        </div>
      );
    }

    const params = this.props.params.map(param => {
      return (
        <div key={Math.random()} className="execution-context__param">
          <div className="execution-context__param-value">
            <div className="execution-context__param-unicode">{'\u2192'}</div>
            {param.type === 'address' ? (
              <div className="execution-context__param-identicon">
                <DappIdenticon identity={param.value} size="small" />
              </div>
            ) : null}
            {param.value}
          </div>
          <div className="execution-context__param-type">{param.type}</div>
        </div>
      );
    });

    return (
      <div className="execution-context__details">
        {showTxExecutingFunction && (
          <div className="execution-context__details-row">
            Transaction Executing Function:{' '}
            <span className="execution-context__execution-function">
              {executionFunction.slice(0, executionFunction.indexOf('('))}
            </span>
          </div>
        )}

        <div className="execution-context__details-row">
          Ether Amount:{' '}
          <span className="bold">{this.formattedBalance(value)}</span>
        </div>

        <div className="execution-context__details-row">
          Gas Estimate: <span className="bold">{estimatedGas}</span>
        </div>

        {isTokenTransfer && (
          <div>
            <div className="execution-context__details-row">
              Token Name: <span className="bold">{tokenDisplayName}</span>
            </div>
            <div className="execution-context__details-row">
              Token Contract Address:{' '}
              <DappIdenticon identity={token.address} size="small" />
              <span className="bold">{token.address}</span>
            </div>
          </div>
        )}

        {this.props.params.length > 0 && (
          <div>
            <div className="execution-context__params-title">Parameters</div>
            <div className="execution-context__params-table">{params}</div>
          </div>
        )}

        <div
          className="execution-context__details-link"
          onClick={this.handleDetailsClick}
        >
          Less details
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="execution-context">
        {this.renderExecutionSentence()}
        {this.renderMoreDetails()}
      </div>
    );
  }
}

export default ExecutionContext;
