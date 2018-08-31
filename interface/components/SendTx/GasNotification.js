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
            {i18n.t('mist.sendTx.estimatedGasError')}
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
          {i18n.t('mist.sendTx.notEnoughGas')}
        </div>
      );
    } else if (this.props.gasError === 'overBlockGasLimit') {
      return (
        <div className="info dapp-error">
          {i18n.t('mist.sendTx.overBlockGasLimit')}
        </div>
      );
    }

    return null;
  }
}

export default GasNotification;
