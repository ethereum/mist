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
        payload: { etherPriceUSD: priceData.USD }
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
    dispatch({ type: '[CLIENT]:CONFIRM_TX:START', payload: { data } });

    // reject if sending to itself
    if (data.to && data.from === data.to.toLowerCase()) {
      displayNotification('sameAccount', 5);

      return dispatch({
        type: '[CLIENT]:CONFIRM_TX:FAILURE',
        error: 'sameAccount'
      });
    }

    // reject if no gas
    if (!data.gas || !_.isFinite(data.gas)) {
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
      // Set gas price in case increased for priority
      newTx.gasPrice = data.gasPrice;
      // Use estimatedGas if gas wasn't provided
      newTx.gas = data.gas;
      // Remove unneeded props
      delete newTx.unlocking;
      delete newTx.gasLoading;
      // Add helpful props
      newTx.hash = hash;
      newTx.networkId = networkId;
      newTx.nonce = nonce;
      newTx.blockNumber = null;
      if (newTx.isNewContract) {
        newTx.contractAddress = null;
      }
      newTx.createdAt = new Date();
      dispatch({
        type: '[CLIENT]:NEW_TX:SENT',
        payload: { newTx }
      });
    });
  };
}

export function updateTx(tx) {
  return (dispatch, getState) => {
    // We use `hash` over `transactionHash` for brevity
    tx.hash = tx.transactionHash;
    delete tx.transactionHash;
    // Convert status to 0 (failed) or 1 (successful)
    if (web3.utils.isHex(tx.status)) {
      tx.status = web3.utils.hexToNumber(tx.status);
    }
    dispatch({
      type: '[CLIENT]:TX:UPDATE',
      payload: { tx }
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

    if (!data || data.length <= 8) {
      return;
    }

    const bytesSignature =
      data.substr(0, 2) === '0x'
        ? data.substr(0, 10)
        : '0x' + data.substr(0, 8);

    const submitExecutionFunction = executionFunction => {
      dispatch({
        type: '[CLIENT]:LOOKUP_SIGNATURE:SUCCESS',
        payload: { executionFunction }
      });

      if (executionFunction === 'transfer(address,uint256)') {
        dispatch(getTokenDetails());
      }

      dispatch(decodeFunctionSignature(executionFunction, data));
    };

    let executionFunction = _.first(window.SIGNATURES[bytesSignature]);

    if (executionFunction) {
      submitExecutionFunction(executionFunction);
    } else {
      fetch(
        `https://www.4byte.directory/api/v1/signatures/?hex_signature=${bytesSignature}`
      ).then(async response => {
        const fourByte = await response.json();
        if (fourByte && fourByte.results) {
          // Get the earliest submitted signature (last result in array)
          executionFunction = fourByte.results.slice(-1)[0].text_signature;
          submitExecutionFunction(executionFunction);
        } else {
          const error = 'No signature found';
          dispatch({ type: '[CLIENT]:LOOKUP_SIGNATURE:FAILED', error });
        }
      });
    }
  };
}

function decodeFunctionSignature(signature, data) {
  return dispatch => {
    dispatch({ type: '[CLIENT]:DECODE_FUNCTION_SIGNATURE:START' });
    ipc.send('backendAction_decodeFunctionSignature', signature, data);
    ipc.on('uiAction_decodedFunctionSignatures', (event, params) => {
      dispatch({
        type: '[CLIENT]:DECODE_FUNCTION_SIGNATURE:SUCCESS',
        payload: { params }
      });
    });
  };
}

export function togglePriority() {
  return { type: '[CLIENT]:PRIORITY:TOGGLE' };
}

export function setLocalPeerCount(peerCount) {
  return (dispatch, getState) => {
    if (peerCount != getState().nodes.local.peerCount) {
      dispatch({
        type: '[CLIENT]:NODES:UPDATE_LOCAL_PEER_COUNT',
        payload: { peerCount }
      });
    }
  };
}
