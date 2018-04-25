import React from 'react';

class RequestAccount extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      creating: false,
      passwordInputType: 'text',
      pw: '',
      pwRepeat: '',
      showPassword: false,
      showRepeat: false
    };
  }

  resetForm() {
    this.setState({
      pw: '',
      pwRepeat: '',
      showRepeat: false,
      creating: false
    });
  }

  handleCancel(e) {
    e.preventDefault();
    ipc.send('backendAction_closePopupWindow');
  }

  handleSubmit(e) {
    e.preventDefault();

    const { pw, pwRepeat } = this.state;

    // ask for password repeat
    if (!pwRepeat.length) {
      this.setState({ showRepeat: true });
      this.refs.password_repeat.focus();
      return;
    }

    // check passwords
    if (pw !== pwRepeat) {
      GlobalNotification.warning({
        content: TAPi18n.__(
          'mist.popupWindows.requestAccount.errors.passwordMismatch'
        ),
        duration: 3
      });
      this.resetForm();
    } else if (pw && pw.length < 8) {
      GlobalNotification.warning({
        content: TAPi18n.__(
          'mist.popupWindows.requestAccount.errors.passwordTooShort'
        ),
        duration: 3
      });
      this.resetForm();
    } else if (pw && pw.length >= 8) {
      this.setState({ creating: true }, () => this.createAccount(pwRepeat));
    }
  }

  createAccount(pw) {
    web3.eth.personal.newAccount(pw).then(address => {
      ipc.send('backendAction_windowMessageToOwner', null, address);

      // notify about backing up!
      alert(TAPi18n.__('mist.popupWindows.requestAccount.backupHint'));

      this.resetForm();

      ipc.send('backendAction_closePopupWindow');
    });
  }

  renderFormBody() {
    if (this.state.creating) {
      return <h2>{i18n.t('mist.popupWindows.requestAccount.creating')}</h2>;
    } else {
      return (
        <div>
          <div
            className={`field-container ${
              this.state.showRepeat ? 'repeat-field' : ''
            }`}
          >
            <input
              autoFocus
              type={this.state.showPassword ? 'text' : 'password'}
              placeholder={i18n.t(
                'mist.popupWindows.requestAccount.enterPassword'
              )}
              className="password"
              value={this.state.pw}
              onChange={e => this.setState({ pw: e.target.value })}
            />
            <input
              type={this.state.showPassword ? 'text' : 'password'}
              placeholder={i18n.t(
                'mist.popupWindows.requestAccount.repeatPassword'
              )}
              className="password-repeat"
              ref="password_repeat"
              value={this.state.pwRepeat}
              onChange={e => this.setState({ pwRepeat: e.target.value })}
            />
          </div>
          <div className="show-password-container">
            <input
              id="show-password-checkbox"
              type="checkbox"
              name="elements_input_bool"
              className="show-password abi-input"
              checked={this.state.showPassword}
              onChange={() =>
                this.setState({ showPassword: !this.state.showPassword })
              }
            />
            <label htmlFor="show-password-checkbox">
              {i18n.t('mist.popupWindows.importAccount.buttons.showPassword')}
            </label>
          </div>

          <div className="dapp-modal-buttons">
            <button
              className="cancel"
              type="button"
              onClick={e => this.handleCancel(e)}
            >
              {i18n.t('buttons.cancel')}
            </button>
            <button className="ok dapp-primary-button" type="submit">
              {i18n.t('buttons.ok')}
            </button>
          </div>
        </div>
      );
    }
  }

  render() {
    return (
      <div className="popup-windows request-account">
        <form onSubmit={e => this.handleSubmit(e)}>
          <h1>{i18n.t('mist.popupWindows.requestAccount.title')}</h1>

          {this.renderFormBody()}
        </form>
      </div>
    );
  }
}

export default RequestAccount;
