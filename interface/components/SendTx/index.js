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
  confirmTx,
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
      gasError: ''
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
    this.props.dispatch(determineIfContract(this.props.newTx.to));
  }

  lookupSignature() {
    const { data } = this.props.newTx;
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
    const { data, to, from, gas, gasPrice, value } = this.props.newTx;

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

    this.props.dispatch(confirmTx(txData));
  };

  render() {
    const { from, to, value } = this.props.newTx;

    return (
      <div className="popup-windows tx-info">
        <div ref={divElement => (this.divElement = divElement)}>
          <ExecutionContext
            adjustWindowHeight={this.adjustWindowHeight}
            data={this.props.newTx.data}
            estimatedFee={this.state.estimatedFee}
            estimatedGas={this.props.newTx.estimatedGas}
            executionFunction={this.props.newTx.executionFunction}
            gasLoading={this.props.newTx.gasLoading}
            isNewContract={this.props.newTx.isNewContract}
            network={this.props.nodes.network}
            params={this.props.newTx.params}
            priceUSD={this.props.newTx.priceUSD}
            providedGas={this.state.providedGas}
            showFormattedParams={this.state.showFormattedParams}
            to={to}
            toIsContract={this.props.newTx.toIsContract}
            value={this.props.newTx.value}
            token={this.props.newTx.token}
          />

          <TxParties
            fromIsContract={this.state.fromIsContract}
            from={from}
            isNewContract={this.props.newTx.isNewContract}
            to={to}
            toIsContract={this.props.newTx.toIsContract}
            executionFunction={this.props.newTx.executionFunction}
            params={this.props.newTx.params}
            hasSignature={this.state.hasSignature}
            value={value}
          />

          <FeeSelector
            estimatedGas={this.props.newTx.estimatedGas}
            priceUSD={this.props.newTx.priceUSD}
            network={this.props.nodes.network}
          />

          <GasNotification
            estimatedGas={this.props.newTx.estimatedGas}
            gasLoading={this.props.newTx.gasLoading}
            gasError={this.state.gasError}
            toIsContract={this.props.newTx.toIsContract}
            to={to}
          />

          <Footer
            unlocking={this.props.newTx.unlocking}
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
