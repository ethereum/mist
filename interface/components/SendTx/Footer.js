import React, { Component } from 'react';

class Footer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pw: ''
    };
  }

  handleSubmit = e => {
    e.preventDefault();
    this.props.handleSubmit(this.state);
    this.setState({ pw: '' });
  };

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
        <form onSubmit={this.handleSubmit} className="footer__form">
          <input
            className="footer__input"
            type="password"
            value={this.state.pw}
            onChange={e => this.setState({ pw: e.target.value })}
            placeholder={i18n.t(
              'mist.popupWindows.sendTransactionConfirmation.enterPassword'
            )}
          />

          <button
            className="footer__btn"
            disabled={!this.state.pw}
            type="submit"
          >
            Execute
          </button>
        </form>
      </footer>
    );
  }
}

export default Footer;
