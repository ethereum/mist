import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import ExecutionContext from './ExecutionContext';
import FeeSelector from './FeeSelector';
import Footer from './Footer';
import GasNotification from './GasNotification';
import TransactionParties from './TransactionParties';
import {
  determineIfContract,
  confirmTransaction,
  lookupSignature
} from '../../actions.js';

class SendTransactionConfirmation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      estimatedGas: 3000000,
      hasSignature: false,
      providedGas: 0,
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
    this.props.dispatch(determineIfContract(this.props.newTransaction.to));
  }

  lookupSignature() {
    const { data } = this.props.newTransaction;
    this.props.dispatch(lookupSignature(data));
  }

  estimateGasUsage() {
    this.setState({ gasLoading: true });
    const { gas } = this.props.newTransaction;

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
      const priceData = await response.json();
      console.log('∆∆∆ priceData', priceData);

      this.setState({ priceUSD: priceData.USD });
    });
  }

  handleSubmit = formData => {
    const { data, to, from, gas, gasPrice, value } = this.props.newTransaction;

    let txData = {
      data,
      from,
      gas,
      gasPrice,
      chosenGas: gas, // TODO
      pw: formData.pw,
      value
    };

    if (to) {
      txData.to = to;
    }

    this.props.dispatch(confirmTransaction(txData));
  };

  render() {
    const { from, to, value } = this.props.newTransaction;

    return (
      <div className="popup-windows tx-info">
        <ExecutionContext
          data={this.props.newTransaction.data}
          estimatedFee={this.state.estimatedFee}
          estimatedGas={this.state.estimatedGas}
          executionFunction={this.props.newTransaction.executionFunction}
          gasLoading={this.state.gasLoading}
          isNewContract={this.props.newTransaction.isNewContract}
          network={this.props.nodes.network}
          params={this.props.newTransaction.params}
          priceUSD={this.state.priceUSD}
          providedGas={this.state.providedGas}
          showFormattedParams={this.state.showFormattedParams}
          to={to}
          toIsContract={this.props.newTransaction.toIsContract}
          value={this.props.newTransaction.value}
        />

        <TransactionParties
          fromIsContract={this.state.fromIsContract}
          from={from}
          isNewContract={this.props.newTransaction.isNewContract}
          to={to}
          toIsContract={this.props.newTransaction.toIsContract}
          executionFunction={this.props.newTransaction.executionFunction}
          hasSignature={this.state.hasSignature}
          value={value}
        />

        <FeeSelector
          estimatedGas={this.state.estimatedGas}
          priceUSD={this.state.priceUSD}
          network={this.props.nodes.network}
        />

        <GasNotification
          estimatedGas={this.state.estimatedGas}
          gasLoading={this.state.gasLoading}
          gasError={this.state.gasError}
          toIsContract={this.props.newTransaction.toIsContract}
          to={to}
        />

        <Footer
          unlocking={this.props.newTransaction.unlocking}
          handleSubmit={this.handleSubmit}
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
