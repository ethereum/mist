import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import ExecutionContext from './ExecutionContext';
import FeeSelector from './FeeSelector';
import Footer from './Footer';
import GasNotification from './GasNotification';
import TxParties from './TxParties';
import {
  determineIfContract,
  confirmTransaction,
  estimateGasUsage,
  getGasPrice,
  getPriceConversion,
  lookupSignature,
  setWindowSize
} from '../../actions.js';

class SendTx extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasSignature: false,
      providedGas: 0,
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
    this.adjustWindowHeight();
  }

  getGasPrice() {
    this.props.dispatch(getGasPrice());
  }

  determineIfContract() {
    this.props.dispatch(determineIfContract(this.props.newTransaction.to));
  }

  lookupSignature() {
    const { data } = this.props.newTransaction;
    this.props.dispatch(lookupSignature(data));
  }

  estimateGasUsage() {
    this.props.dispatch(estimateGasUsage());
  }

  getPriceConversion() {
    this.props.dispatch(getPriceConversion());
  }

  adjustWindowHeight = () => {
    const height = this.divElement.clientHeight;
    this.props.dispatch(setWindowSize(height));
  };

  handleSubmit = formData => {
    const { data, to, from, gas, gasPrice, value } = this.props.newTransaction;

    let txData = {
      data,
      from,
      gas,
      gasPrice,
      chosenGas: gas, // TODO: priority?
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
        <div ref={divElement => (this.divElement = divElement)}>
          <ExecutionContext
            adjustWindowHeight={this.adjustWindowHeight}
            data={this.props.newTransaction.data}
            estimatedFee={this.state.estimatedFee}
            estimatedGas={this.props.newTransaction.estimatedGas}
            executionFunction={this.props.newTransaction.executionFunction}
            gasLoading={this.props.newTransaction.gasLoading}
            isNewContract={this.props.newTransaction.isNewContract}
            network={this.props.nodes.network}
            params={this.props.newTransaction.params}
            priceUSD={this.state.priceUSD}
            providedGas={this.state.providedGas}
            showFormattedParams={this.state.showFormattedParams}
            to={to}
            toIsContract={this.props.newTransaction.toIsContract}
            value={this.props.newTransaction.value}
            token={this.props.newTransaction.token}
          />

          <TxParties
            fromIsContract={this.state.fromIsContract}
            from={from}
            isNewContract={this.props.newTransaction.isNewContract}
            to={to}
            toIsContract={this.props.newTransaction.toIsContract}
            executionFunction={this.props.newTransaction.executionFunction}
            params={this.props.newTransaction.params}
            hasSignature={this.state.hasSignature}
            value={value}
          />

          <FeeSelector
            estimatedGas={this.props.newTransaction.estimatedGas}
            priceUSD={this.state.priceUSD}
            network={this.props.nodes.network}
          />

          <GasNotification
            estimatedGas={this.props.newTransaction.estimatedGas}
            gasLoading={this.props.newTransaction.gasLoading}
            gasError={this.state.gasError}
            toIsContract={this.props.newTransaction.toIsContract}
            to={to}
          />

          <Footer
            unlocking={this.props.newTransaction.unlocking}
            handleSubmit={this.handleSubmit}
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(SendTx);
