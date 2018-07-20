import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import ExecutionContext from './ExecutionContext';
import FeeSelector from './FeeSelector';
import Footer from './Footer';
import GasNotification from './GasNotification';
import TransactionParties from './TransactionParties';

class SendTransactionConfirmation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      estimatedGas: 3000000,
      executionFunction: '',
      hasSignature: false,
      providedGas: 0,
      toIsContract: false,
      unlocking: false,
      gasPrice: this.props.newTransaction.gasPrice || 0,
      gasError: '',
      priceUSD: ''
    };
  }

  componentDidMount() {
    this.getGasPrice();
    this.determineIfContract();
    this.lookupSignature();
    this.estimateGasUsage();
    this.getPriceConversion();
  }

  getGasPrice() {
    if (!this.props.newTransaction.gasPrice) {
      web3.eth.getGasPrice((e, res) => {
        if (!e) {
          const gasPrice = '0x' + res.toString(16);
          this.setState({ gasPrice });
        }
      });
    }
  }

  determineIfContract() {
    // Determine if "to" is a contract
    web3.eth.getCode(this.props.newTransaction.to, (e, res) => {
      console.log('∆∆∆ getCode e', e);
      console.log('∆∆∆ getCode res', res);
      if (!e && res && res.length > 2) {
        this.setState({ toIsContract: true });
        // setWindowSize(template);
      }
    });
  }

  lookupSignature() {
    const { data } = this.props.newTransaction;

    if (data && data.length > 8) {
      const bytesSignature =
        data.substr(0, 2) === '0x'
          ? data.substr(0, 10)
          : '0x' + data.substr(0, 8);

      // try window.SIGNATURES first
      if (_.first(window.SIGNATURES[bytesSignature])) {
        console.log('∆∆∆ exFunc', _.first(window.SIGNATURES[bytesSignature]));

        this.setState({
          executionFunction: _.first(window.SIGNATURES[bytesSignature])
        });
      } else {
        fetch(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${bytesSignature}`
        ).then(response => {
          console.log('∆∆∆ 4byte response', response);
        });
      }
    }
  }

  estimateGasUsage() {
    this.setState({ gasLoading: true });
    const { gas } = this.props.newTransaction;

    console.log('∆∆∆ est gas...');
    web3.eth.estimateGas(this.props.newTransaction).then((value, err) => {
      console.log('∆∆∆ est gas');
      console.log('∆∆∆ value', value);
      console.log('∆∆∆ err', err);

      if (value) {
        return this.setState({ estimatedGas: value, gasLoading: false });
      }

      this.setState({ gasLoading: false });
    });
  }

  getPriceConversion() {
    const url = `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,GBP,BRL&extraParams=Mist-${
      mist.version
    }`;

    fetch(url).then(async (response, err) => {
      console.log('∆∆∆ conversion:');
      console.log('∆∆∆ response', response);
      console.log('∆∆∆ err', err);

      const priceData = await response.json();
      console.log('∆∆∆ priceData', priceData);

      this.setState({ priceUSD: priceData.USD });
    });
  }

  // TODO: new designs: function name as title
  renderTitle() {
    if (this.state.toIsContract) {
      return (
        <h3>
          {i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.title.contractExecution'
          )}
        </h3>
      );
    } else if (this.props.newTransaction && this.props.newTransaction.to) {
      return (
        <h3>
          {i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.title.sendTransaction'
          )}
        </h3>
      );
    } else {
      return (
        <h3>
          {i18n.t(
            'mist.popupWindows.sendTransactionConfirmation.title.createContract'
          )}
        </h3>
      );
    }
  }

  closePopup = () => {
    // TODO: abstract to Redux
    ipc.send(
      'backendAction_unlockedAccountAndSentTransaction',
      'Transaction not confirmed'
    );
    ipc.send('backendAction_closePopupWindow');
  };

  render() {
    const { from, to, value } = this.props.newTransaction;

    return (
      <div className="popup-windows tx-info">
        {this.renderTitle()}

        <ExecutionContext
          data={this.props.newTransaction.data}
          estimatedFee={this.state.estimatedFee}
          estimatedGas={this.state.estimatedGas}
          gasLoading={this.state.gasLoading}
          priceUSD={this.state.priceUSD}
          providedGas={this.state.providedGas}
          showFormattedParams={this.state.showFormattedParams}
          to={to}
          toIsContract={this.state.toIsContract}
          value={this.props.newTransaction.value}
        />

        <TransactionParties
          fromIsContract={this.state.fromIsContract}
          from={from}
          to={to}
          executionFunction={this.state.executionFunction}
          hasSignature={this.state.hasSignature}
          value={value}
        />

        <FeeSelector
          estimatedGas={this.state.estimatedGas}
          priceUSD={this.state.priceUSD}
        />

        <GasNotification
          estimatedGas={this.state.estimatedGas}
          gasLoading={this.state.gasLoading}
          gasError={this.state.gasError}
          toIsContract={this.state.toIsContract}
          to={to}
        />

        <Footer
          unlocking={this.state.unlocking}
          network={this.props.network}
          closePopup={this.closePopup}
        />

        {/* <form action="#">

              <div class="container">
              <div class="inner-container">
                  <div class="transaction-parties">
                    <div>
                        {{#if TemplateVar.get "fromIsContract"}}
                            <i class="overlap-icon icon-doc"></i>
                        {{else}}
                            <i class="overlap-icon icon-key"></i>
                        {{/if}}
                        {{> dapp_identicon identity=from class="dapp-large"}}
                        <br>
                        <span class="simptip-position-bottom simptip-movable" data-tooltip="{{from}}">{{shortenAddress from}}</span>
                    </div>
                    <div class="connection">
                        <div class="amount">
                            {{{totalAmount}}} <span class="unit">ETHER</span>
                        </div>
                        {{#if TemplateVar.get "executionFunction" }}
                            <div class='function-signature {{#if TemplateVar.get "hasSignature"}} has-signature {{/if}} '>
                                    {{TemplateVar.get "executionFunction"}}
                            </div>
                        {{/if}}
                    </div>

                    <div>
                        {{#if to}}
                            {{#if TemplateVar.get "toIsContract"}}
                                <i class="overlap-icon icon-doc"></i>
                            {{else}}
                                <i class="overlap-icon icon-key"></i>
                            {{/if}}
                            {{> dapp_identicon identity=to class="dapp-large"}}
                            <br>
                            <a href="http://etherscan.io/address/{{to}}#code" class="simptip-position-bottom simptip-movable" data-tooltip="{{to}}" target="_blank">{{shortenAddress to}}</a>
                        {{else}}
                            <i class="circle-icon icon-doc"></i>
                            <br>
                            <span>{{i18n "mist.popupWindows.sendTransactionConfirmation.createContract"}}</span>
                        {{/if}}
                    </div>
              </div>

              {{#if transactionInvalid}}
                  {{#if (TemplateVar.get "gasLoading") }}
                      <p class="info gas-loading"> 
                          {{> spinner}}
                      </p>
                  {{ else }}
                      <p class="info dapp-error"> 
                          {{i18n "mist.popupWindows.sendTransactionConfirmation.estimatedGasError"}}
                      </p>
                  {{/if}}
              {{else}}
                  {{#unless $eq (TemplateVar.get "gasError") "notEnoughGas"}}
                      {{#if $eq (TemplateVar.get "gasError") "overBlockGasLimit"}}
                          <div class="info dapp-error">
                              {{i18n "mist.popupWindows.sendTransactionConfirmation.overBlockGasLimit"}}
                          </div>
                      {{else}}
                          {{#if $and data (TemplateVar.get "toIsContract")}}
                              <p class="info">
                              {{i18n "mist.popupWindows.sendTransactionConfirmation.contractExecutionInfo"}}
                              </p>
                          {{/if}}

                          {{#unless to}}
                              <p class="info">
                              {{i18n "mist.popupWindows.sendTransactionConfirmation.contractCreationInfo"}}
                              </p>
                          {{/unless}}

                      {{/if}}
                  {{else}}
                      <div class="info dapp-error not-enough-gas" style="cursor: pointer;">
                          {{{i18n "mist.popupWindows.sendTransactionConfirmation.notEnoughGas"}}}
                      </div>
                  {{/unless}}
              {{/if}}

              <div class="fees">
                  <ul>
                      <li>
                          <div class="value">
                          {{i18n "mist.popupWindows.sendTransactionConfirmation.estimatedFee"}}
                          </div>
                          <div class="type">
                              {{#if $eq (TemplateVar.get "estimatedGas") "invalid"}}
                                  <span class="red"><i class="icon-shield"></i> {{i18n "mist.popupWindows.sendTransactionConfirmation.transactionThrow"}}</span>
                              {{else}}

                                  {{#if $eq (dapp_formatNumber (TemplateVar.get "estimatedGas") "0") "0"}}
                                      {{#if (TemplateVar.get "gasLoading") }}
                                          {{i18n "mist.popupWindows.sendTransactionConfirmation.gasLoading"}}
                                          {{> spinner}}
                                      {{else}}
                                          <span class="red"><i class="icon-shield"></i> {{i18n "mist.popupWindows.sendTransactionConfirmation.noEstimate"}}</span>
                                      {{/if}}
                                  {{else}}
                                      {{estimatedFee}} ({{dapp_formatNumber (TemplateVar.get "estimatedGas") "0,0"}} gas)
                                  {{/if}}



                              {{/if}}
                          </div>
                      </li>
                      <li>
                          <div class="value">
                              {{i18n "mist.popupWindows.sendTransactionConfirmation.gasLimit"}}
                          </div>
                          <div class="type">
                              {{providedGas}} ether (<span class="provided-gas" contenteditable="true">{{dapp_formatNumber (TemplateVar.get 'initialProvidedGas') '0'}}</span> gas)
                          </div>
                      </li>
                      <li>
                          <div class="value">
                              {{i18n "mist.popupWindows.sendTransactionConfirmation.gasPrice"}}
                          </div>
                          <div class="type">{{dapp_formatBalance gasPrice "0,0.0[0000]" "szabo"}} {{i18n "mist.popupWindows.sendTransactionConfirmation.perMillionGas"}}</div>
                      </li>
                  </ul>
              </div>

              {{#if data}}
                  {{#if showFormattedParams}}
                      <div class="parameters">
                          <h3>{{i18n "mist.popupWindows.sendTransactionConfirmation.parameters"}}
                              <a href="#" class="toggle-panel">{{i18n "mist.popupWindows.sendTransactionConfirmation.showRawBytecode"}}</a>
                          </h3>
                          <ol>
                          {{# each param in params}}
                              <li>{{> dapp_output output=param }}</li>
                          {{/each}}
                          </ol>
                      </div>
                  {{else}}
                      <div class="data">
                          <h3>{{i18n "mist.popupWindows.sendTransactionConfirmation.data"}}

                          {{# if params}}
                              <a href="#" class="toggle-panel">{{i18n "mist.popupWindows.sendTransactionConfirmation.showDecodedParameters"}}</a>
                          {{else}}
                              {{#if to}}
                                  {{#unless (TemplateVar.get "lookingUpFunctionSignature")}}
                                      <a class="lookup-function-signature simptip-position-bottom simptip-movable" data-tooltip="{{i18n 'mist.popupWindows.sendTransactionConfirmation.lookupDataExplainer'}}"> {{i18n "mist.popupWindows.sendTransactionConfirmation.lookupData"}}
                                      </a>
                                  {{/unless}}
                              {{/if}}
                          {{/if}}
                          </h3>

                          <pre>{{{formattedData}}}</pre>
                      </div>
                  {{/if}}
              {{/if}}

              </div>
              </div>
              <footer>
              {{#if TemplateVar.get "unlocking"}}
                  <h2>{{i18n "mist.popupWindows.sendTransactionConfirmation.unlocking"}}</h2>
              {{else}}
                  <input type="password" placeholder="{{i18n 'mist.popupWindows.sendTransactionConfirmation.enterPassword'}}">

                  {{#if $neq (TemplateVar.get "network") "main"}}
                      <div class="network">
                          {{TemplateVar.get "network"}}
                      </div>
                  {{/if}}

                  <div class="dapp-modal-buttons">
                      <button class="cancel" type="button">{{i18n "buttons.cancel"}}</button>
                      <button class="ok dapp-primary-button" type="submit">{{i18n "mist.popupWindows.sendTransactionConfirmation.buttons.sendTransaction"}}</button>
                  </div>
              {{/if}}
              </footer>

        </form>
 */}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(SendTransactionConfirmation);
