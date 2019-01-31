import React, { Component } from 'react';
import DappIdenticon from '../DappIdenticon';
import ContextDescription from './ContextDescription';

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

  handleDetailsClick = () => {
    this.setState({ showDetails: !this.state.showDetails }, () =>
      this.props.adjustWindowHeight()
    );
  };

  renderMoreDetails() {
    const {
      estimatedGas,
      executionFunction,
      gasError,
      gasPriceGweiStandard,
      gasPriceGweiPriority,
      isNewContract,
      toIsContract,
      token,
      value
    } = this.props;

    if (!toIsContract && !isNewContract) {
      return null;
    }

    const isTokenTransfer = executionFunction === 'transfer(address,uint256)';

    const showTxExecutingFunction =
      executionFunction && !isNewContract && !isTokenTransfer;

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
          {i18n.t('mist.sendTx.showDetails')}
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
                <span className="execution-context__param-address">
                  {param.value}
                </span>
              </div>
            ) : (
              param.value
            )}
          </div>
          <div className="execution-context__param-type">{param.type}</div>
        </div>
      );
    });

    return (
      <div className="execution-context__details">
        {gasError && (
          <div className="execution-context__details-row">
            <span className="execution-context__details-title">
              {i18n.t('mist.sendTx.errorMessage')}
            </span>
            <span className="execution-context__details-value">{gasError}</span>
          </div>
        )}

        {showTxExecutingFunction && (
          <div className="execution-context__details-row">
            <span className="execution-context__details-title">
              {i18n.t('mist.sendTx.transactionExecutingFunction')}
            </span>
            <span className="execution-context__execution-function">
              {executionFunction}
            </span>
          </div>
        )}

        <div className="execution-context__details-row">
          <span className="execution-context__details-title">
            {i18n.t('mist.sendTx.etherAmount')}
          </span>
          <span className="execution-context__details-value">
            {this.formattedBalance(value)}
          </span>
        </div>

        <div className="execution-context__details-row">
          <span className="execution-context__details-title">
            {i18n.t('mist.sendTx.gasPriceStandard')}
          </span>
          <span className="execution-context__details-value">{`${gasPriceGweiStandard} Gwei`}</span>
        </div>

        <div className="execution-context__details-row">
          <span className="execution-context__details-title">
            {i18n.t('mist.sendTx.gasPricePriority')}
          </span>
          <span className="execution-context__details-value">{`${gasPriceGweiPriority} Gwei`}</span>
        </div>

        <div className="execution-context__details-row">
          <span className="execution-context__details-title">
            {i18n.t('mist.sendTx.gasEstimate')}
          </span>
          <span className="execution-context__details-value">
            {estimatedGas}
          </span>
        </div>

        {isTokenTransfer && (
          <div>
            {tokenDisplayName && (
              <div className="execution-context__details-row">
                <span className="execution-context__details-title">
                  {i18n.t('mist.sendTx.tokenName')}
                </span>
                <span className="bold">{tokenDisplayName}</span>
              </div>
            )}
            {token.address && (
              <div className="execution-context__details-row">
                <span className="execution-context__details-title">
                  {i18n.t('mist.sendTx.tokenContractName')}
                </span>
                <DappIdenticon identity={token.address} size="small" />
                <span className="bold execution-context__address">
                  {token.address}
                </span>
              </div>
            )}
          </div>
        )}

        {this.props.params.length > 0 && (
          <div>
            <div className="execution-context__params-title">
              {i18n.t('mist.sendTx.parameters')}
            </div>
            <div className="execution-context__params-table">{params}</div>
          </div>
        )}

        <div
          className="execution-context__details-link"
          onClick={this.handleDetailsClick}
        >
          {i18n.t('mist.sendTx.hideDetails')}
        </div>
      </div>
    );
  }

  render() {
    return (
      <div
        className="execution-context"
        style={{
          backgroundColor: !!this.props.gasError ? '#fff4cb' : '#fdfdfd'
        }}
      >
        <ContextDescription />
        {this.renderMoreDetails()}
      </div>
    );
  }
}

export default ExecutionContext;
