import React, { Component } from 'react';

class Fees extends Component {
  renderEstimatedFee() {
    if (this.state.estimatedGas === 'invalid') {
      return (
        <span className="red">
          <i className="icon-shield" />
          {i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.transactionThrow'
          )}
        </span>
      );
    }

    if (this.state.estimatedGas === 0) {
      if (this.state.gasLoading) {
        return (
          <span>
            {i18n.t('mist.popupWindows.sendTransactionConfirmation.gasLoading')}
            (spinner)
          </span>
        );
      } else {
        return (
          <span className="red">
            <i className="icon-shield" />{' '}
            {i18n.t('mist.popupWindows.sendTransactionConfirmation.noEstimate')}
          </span>
        );
      }
    }

    return (
      <span>
        {this.state.estimatedFee} ({this.state.estimatedGas} gas)
      </span>
    );
    // {{estimatedFee}} ({{dapp_formatNumber (TemplateVar.get "estimatedGas") "0,0"}} gas)
  }

  render() {
    return (
      <div className="fees">
        <ul>
          <li>
            <div className="value">
              {i18n.t(
                'mist.popupWindows.sendTransactionConfirmation.estimatedFee'
              )}
            </div>
            <div className="type">{this.renderEstimatedFee()}</div>
          </li>
          <li>
            <div className="value">
              {i18n.t('mist.popupWindows.sendTransactionConfirmation.gasLimit')}
            </div>
            <div className="type">
              {this.state.providedGas} ether (
              <span className="provided-gas" contentEditable="true">
                {/* {dapp_formatNumber (TemplateVar.get 'initialProvidedGas') '0'} */}
              </span>{' '}
              gas)
            </div>
          </li>
          <li>
            <div className="value">
              {i18n.t('mist.popupWindows.sendTransactionConfirmation.gasPrice')}
            </div>
            <div className="type">
              {/* {dapp_formatBalance gasPrice "0,0.0[0000]" "szabo"} */}{' '}
              {i18n.t(
                'mist.popupWindows.sendTransactionConfirmation.perMillionGas'
              )}
            </div>
          </li>
        </ul>
      </div>
    );
  }
}

export default Fees;
