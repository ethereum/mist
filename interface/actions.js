export function setWindowSize(height) {
  return dispatch => {
    dispatch({ type: '[CLIENT]:SET_WINDOW_SIZE:START', payload: { height } });

    // footer + padding = 104px
    ipc.send('backendAction_setWindowSize', 580, height + 104);
  };
}

export function getGasPrice() {
  return dispatch => {
    dispatch({ type: '[CLIENT]:GET_GAS_PRICE:START' });

    web3.eth.getGasPrice((error, res) => {
      if (error) {
        return dispatch({ type: '[CLIENT]:GET_GAS_PRICE:FAILURE', error });
      }

      const gasPrice = '0x' + res.toString(16);
      return dispatch({
        type: '[CLIENT]:GET_GAS_PRICE:SUCCESS',
        payload: { gasPrice }
      });
    });
  };
}

export function estimateGasUsage() {
  return (dispatch, getState) => {
    dispatch({ type: '[CLIENT]:ESTIMATE_GAS_USAGE:START' });

    web3.eth.estimateGas(getState().newTx).then((value, error) => {
      if (error) {
        return dispatch({ type: '[CLIENT]:ESTIMATE_GAS_USAGE:FAILURE', error });
      }

      return dispatch({
        type: '[CLIENT]:ESTIMATE_GAS_USAGE:SUCCESS',
        payload: { estimatedGas: value }
      });
    });
  };
}

export function getPriceConversion() {
  return dispatch => {
    dispatch({ type: '[CLIENT]:GET_PRICE_CONVERSION:START' });

    const url = `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,GBP,BRL&extraParams=Mist-${
      mist.version
    }`;

    fetch(url).then(async (response, error) => {
      if (error) {
        return dispatch({
          type: '[CLIENT]:GET_PRICE_CONVERSION:FAILURE',
          error
        });
      }

      const priceData = await response.json();
      return dispatch({
        type: '[CLIENT]:GET_PRICE_CONVERSION:SUCCESS',
        payload: { priceUSD: priceData.USD }
      });
    });
  };
}

export function getTokenDetails() {
  return (dispatch, getState) => {
    dispatch({ type: '[CLIENT]:GET_TOKEN_DETAILS:START' });

    const tokenListURL =
      'https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/tokens/tokens-eth.json';

    fetch(tokenListURL).then(async (response, error) => {
      if (error) {
        return dispatch({
          type: '[CLIENT]:GET_TOKEN_DETAILS:FAILURE',
          error
        });
      }

      let tokens;

      try {
        tokens = await response.json();
      } catch (error) {
        return dispatch({
          type: '[CLIENT]:GET_TOKEN_DETAILS:JSON_PARSE_FAILURE',
          error
        });
      }

      if (tokens) {
        const contractAddress = getState().newTx.to;
        const theToken = _.find(tokens, token => {
          return token.address.toLowerCase() === contractAddress.toLowerCase();
        });

        if (theToken) {
          const token = {
            name: theToken.name,
            symbol: theToken.symbol,
            address: theToken.address,
            decimals: theToken.decimals
          };

          return dispatch({
            type: '[CLIENT]:GET_TOKEN_DETAILS:SUCCESS',
            payload: { token }
          });
        }
      }
    });
  };
}

export function determineIfContract(toAddress) {
  return dispatch => {
    dispatch({ type: '[CLIENT]:DETERMINE_IF_CONTRACT:START' });

    if (!toAddress) {
      return dispatch({
        type: '[CLIENT]:DETERMINE_IF_CONTRACT:SUCCESS',
        payload: { toIsContract: true, isNewContract: true }
      });
    }

    web3.eth.getCode(toAddress, (error, res) => {
      if (error) {
        // TODO: handle error state
        dispatch({ type: '[CLIENT]:DETERMINE_IF_CONTRACT:FAILURE' });
      }

      if (res && res.length > 2) {
        dispatch({
          type: '[CLIENT]:DETERMINE_IF_CONTRACT:SUCCESS',
          payload: { toIsContract: true, isNewContract: false }
        });
      }
    });
  };
}

export function confirmTx(data) {
  return async (dispatch, getState) => {
    dispatch({ type: '[CLIENT]:CONFIRM_TX:START' });

    // reject if sending to itself
    if (data.to && data.from === data.to.toLowerCase()) {
      displayNotification('sameAccount', 5);

      return dispatch({
        type: '[CLIENT]:CONFIRM_TX:FAILURE',
        error: 'sameAccount'
      });
    }

    // reject if no gas
    if (!data.chosenGas || !_.isFinite(data.chosenGas)) {
      return dispatch({
        type: '[CLIENT]:CONFIRM_TX:FAILURE',
        error: 'noGas'
      });
    }

    const nonce = await web3.eth.getTransactionCount(data.from);
    const networkId = await web3.eth.net.getId();
    const tx = Object.assign({}, data, {
      nonce: `0x${nonce.toString(16)}`
    });

    let signedTx;
    await web3.eth.personal.signTransaction(tx, data.pw || '', function(
      error,
      result
    ) {
      if (error) {
        dispatch({
          type: '[CLIENT]:CONFIRM_TX:FAILURE',
          error
        });

        if (error.message.includes('Unable to connect to socket: timeout')) {
          displayNotification('connectionTimeout', 5);
        } else if (
          error.message.includes('could not decrypt key with given passphrase')
        ) {
          displayNotification('wrongPassword', 3);
        } else if (error.message.includes('multiple keys match address')) {
          displayNotification('multipleKeysMatchAddress', 10);
        } else {
          GlobalNotification.warning({
            content: error.message || error,
            duration: 5
          });
        }
        return;
      }
      signedTx = result.raw;
    });
    delete tx.pw;

    if (!signedTx) {
      dispatch({
        type: '[CLIENT]:CONFIRM_TX:FAILURE',
        error: 'no signedTx'
      });
    }

    web3.eth.sendSignedTransaction(signedTx, (error, hash) => {
      if (error) {
        console.error(`Error from sendSignedTransaction: ${error}`);
        if (error.message.includes('Unable to connect to socket: timeout')) {
          displayNotification('connectionTimeout', 5);
        } else if (
          error.message.includes('Insufficient funds for gas * price + value')
        ) {
          displayNotification('insufficientFundsForGas', 5);
        } else {
          GlobalNotification.warning({
            content: error.message || error,
            duration: 5
          });
        }

        return dispatch({
          type: '[CLIENT]:CONFIRM_TX:FAILURE',
          error
        });
      }

      ipc.send('backendAction_unlockedAccountAndSentTransaction', null, hash);
      dispatch({ type: '[CLIENT]:CONFIRM_TX:SUCCESS' });

      // Format tx for storage
      let newTx = getState().newTx;
      // Remove unneeded props
      delete newTx.unlocking;
      // Add helpful props
      newTx.hash = hash;
      newTx.networkId = networkId;
      newTx.nonce = nonce;
      newTx.blockNumber = null;
      newTx.failed = false;
      if (newTx.isNewContract) {
        newTx.contractAddress = null;
      }
      newTx.createdAt = new Date();
      store.dispatch({
        type: '[CLIENT]:NEW_TX:SENT',
        payload: newTx
      });
    });
  };
}

function displayNotification(errorType, duration) {
  GlobalNotification.warning({
    content: TAPi18n.__(
      `mist.popupWindows.sendTransactionConfirmation.errors.${errorType}`
    ),
    duration
  });
}

export function lookupSignature(data) {
  return dispatch => {
    dispatch({ type: '[CLIENT]:LOOKUP_SIGNATURE:START' });

    if (data && data.length > 8) {
      const bytesSignature =
        data.substr(0, 2) === '0x'
          ? data.substr(0, 10)
          : '0x' + data.substr(0, 8);

      if (_.first(window.SIGNATURES[bytesSignature])) {
        const executionFunction = _.first(window.SIGNATURES[bytesSignature]);

        dispatch({
          type: '[CLIENT]:LOOKUP_SIGNATURE:SUCCESS',
          payload: { executionFunction }
        });

        if (executionFunction === 'transfer(address,uint256)') {
          dispatch(getTokenDetails());
        }

        dispatch(decodeFunctionSignature(executionFunction, data));
      } else {
        fetch(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${bytesSignature}`
        ).then(async response => {
          const fourByte = await response.json();
          console.log('∆∆∆ fourByte', fourByte);
        });
      }
    }
  };
}

function decodeFunctionSignature(signature, data) {
  return dispatch => {
    dispatch({ type: '[CLIENT]:DECODE_FUNCTION_SIGNATURE:START' });
    ipc.send('backendAction_decodeFunctionSignature', signature, data);
    ipc.on('uiAction_decodedFunctionSignatures', (event, params) => {
      console.log('∆∆∆ params (in action)', params);
      dispatch({
        type: '[CLIENT]:DECODE_FUNCTION_SIGNATURE:SUCCESS',
        payload: { params }
      });
    });
  };
}
