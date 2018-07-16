import React, { Component } from 'react';

class Footer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pw: ''
    };
  }

  render() {
    if (this.props.unlocking) {
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
          value={this.state.pw}
          onChange={e => this.setState({ pw: e.target.value })}
          placeholder={i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.enterPassword'
          )}
        />

        {this.props.network !== 'main' ? (
          <div className="network">{this.props.network}</div>
        ) : (
          ''
        )}

        <div className="send-tx__btns">
          <button
            className="send-tx__btn--secondary"
            onClick={() => this.props.closePopup()}
            type="button"
          >
            {i18n.t('buttons.cancel')}
          </button>
          <button
            className="send-tx__btn--primary"
            disabled={!this.state.pw}
            type="submit"
          >
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
