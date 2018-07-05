import React, { Component } from 'react';

class Footer extends Component {
  render() {
    if (this.state.unlocking) {
      return (
        <footer>
          <h2>
            {i18n.t('mist.popupWindows.sendTransactionConfirmation.unlocking')}
          </h2>
        </footer>
      );
    }

    return (
      <footer>
        <input
          type="password"
          placeholder={i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.enterPassword'
          )}
        />

        {this.props.network !== 'main' ? (
          <div className="network">{this.props.network}</div>
        ) : (
          ''
        )}

        <div className="dapp-modal-buttons">
          <button className="cancel" type="button">
            {i18n.t('buttons.cancel')}
          </button>
          <button className="ok dapp-primary-button" type="submit">
            {i18n.t(
              'mist.popupWindows.sendTransactionConfirmation.buttons.sendTransaction'
            )}
          </button>
        </div>
      </footer>
    );
  }
}

export default Footer;
