import React, { Component } from 'react';

class GasNotification extends Component {
  constructor(props) {
    super(props);
  }

  transactionInvalid = () => {
    return (
      this.props.estimatedGas === 'invalid' ||
      this.props.estimatedGas === 0 ||
      typeof this.props.estimatedGas === 'undefined'
    );
  };

  render() {
    if (this.transactionInvalid()) {
      if (this.props.gasLoading) {
        return <p className="info gas-loading">(spinner)</p>;
      } else {
        return (
          <p className="info dapp-error">
            {i18n.t(
              'mist.popupWindows.sendTransactionConfirmation.estimatedGasError'
            )}
          </p>
        );
      }
    }

    if (this.props.gasError === 'notEnoughGas') {
      return (
        <div
          className="info dapp-error not-enough-gas"
          style={{ cursor: 'pointer' }}
        >
          {i18n.t('mist.popupWindows.sendTransactionConfirmation.notEnoughGas')}
        </div>
      );
    } else if (this.props.gasError === 'overBlockGasLimit') {
      return (
        <div className="info dapp-error">
          {i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.overBlockGasLimit'
          )}
        </div>
      );
    } else {
      return (
        <div>
          {this.props.toIsContract ? (
            <p className="info">
              {i18n.t(
                'mist.popupWindows.sendTransactionConfirmation.contractExecutionInfo'
              )}
            </p>
          ) : (
            ''
          )}
        </div>
      );
    }
  }
}

export default GasNotification;
