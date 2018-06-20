/**
Template Controllers

@module Templates
*/

var setWindowSize = function(template) {
  Tracker.afterFlush(function() {
    ipc.send(
      'backendAction_setWindowSize',
      580,
      template.$('.popup-windows .inner-container').height() + 240
    );
  });
};

var defaultEstimateGas = 3000000;

/**
The sendTransaction confirmation popup window template

@class [template] popupWindows_sendTransactionConfirmation
@constructor
*/

/**
Takes a 4-byte function signature and does a best-effort conversion to a
human readable text signature.

@method (lookupFunctionSignature)
*/
var lookupFunctionSignature = function(data, remoteLookup) {
  return new Q(function(resolve, reject) {
    if (data && data.length > 8) {
      var bytesSignature =
        data.substr(0, 2) === '0x'
          ? data.substr(0, 10)
          : '0x' + data.substr(0, 8);

      if (remoteLookup) {
        https
          .get(
            'https://www.4byte.directory/api/v1/signatures/?hex_signature=' +
              bytesSignature,
            function(response) {
              var body = '';

              response.on('data', function(chunk) {
                body += chunk;
              });

              response.on('end', function() {
                var responseData = JSON.parse(body);
                if (responseData.results.length) {
                  resolve(responseData.results[0].text_signature);
                } else {
                  resolve(bytesSignature);
                }
              });
            }
          )
          .on('error', function(error) {
            console.warn('Error querying Function Signature Registry.', err);
            reject(bytesSignature);
          });
      } else if (_.first(window.SIGNATURES[bytesSignature])) {
        resolve(_.first(window.SIGNATURES[bytesSignature]));
      } else {
        reject(bytesSignature);
      }
    } else {
      reject(undefined);
    }
  });
};

var localSignatureLookup = function(data) {
  return lookupFunctionSignature(data, false);
};

var remoteSignatureLookup = function(data) {
  return lookupFunctionSignature(data, true);
};

var signatureLookupCallback = function(textSignature) {
  // Clean version of function signature. Striping params
  TemplateVar.set(
    template,
    'executionFunction',
    textSignature.replace(/\(.+$/g, '')
  );
  TemplateVar.set(template, 'hasSignature', true);

  var params = textSignature.match(/\((.+)\)/i);
  if (params) {
    console.log('params sent', params);
    TemplateVar.set(template, 'executionFunctionParamTypes', params);
    ipc.send('backendAction_decodeFunctionSignature', textSignature, data.data);
  }
};

Template['popupWindows_sendTransactionConfirmation'].onCreated(function() {
  var template = this;

  setNetwork(template);

  ipc.on('uiAction_decodedFunctionSignatures', function(event, params) {
    console.log('params returned', params);
    TemplateVar.set(template, 'params', params);
  });

  // check reactively if provided gas is enough
  this.autorun(function() {
    if (
      TemplateVar.get('estimatedGas') > Number(TemplateVar.get('providedGas'))
    ) {
      TemplateVar.set('gasError', 'notEnoughGas');
    } else if (TemplateVar.get('estimatedGas') > 8000000) {
      TemplateVar.set('gasError', 'overBlockGasLimit');
    } else if (TemplateVar.get('estimatedGas') == defaultEstimateGas) {
      TemplateVar.set('gasError', 'defaultGas');
    } else {
      TemplateVar.set('gasError', null);
    }
  });

  // check inital data and gas estimates
  this.autorun(function() {
    TemplateVar.set(template, 'displayDecodedParams', true);

    var data = Session.get('data');

    if (data) {
      // set window size
      setWindowSize(template);

      // set provided gas to templateVar
      const gas = web3.utils.toBN(data.gas || 0);
      TemplateVar.set('providedGas', gas.toNumber());
      TemplateVar.set('initialProvidedGas', gas.toNumber());

      // add gasPrice if not set
      if (!data.gasPrice) {
        web3.eth.getGasPrice(function(e, res) {
          if (!e) {
            data.gasPrice = '0x' + res.toString(16);
            Session.set('data', data);
          }
        });
      }

      // check if to is a contract
      if (data.to) {
        web3.eth.getCode(data.to, function(e, res) {
          if (!e && res && res.length > 2) {
            TemplateVar.set(template, 'toIsContract', true);
            setWindowSize(template);
          }
        });

        if (data.data) {
          localSignatureLookup(data.data)
            .then(function(textSignature) {
              // Clean version of function signature. Striping params
              TemplateVar.set(
                template,
                'executionFunction',
                textSignature.replace(/\(.+$/g, '')
              );
              TemplateVar.set(template, 'hasSignature', true);

              var params = textSignature.match(/\((.+)\)/i);
              if (params) {
                TemplateVar.set(
                  template,
                  'executionFunctionParamTypes',
                  params
                );
                ipc.send(
                  'backendAction_decodeFunctionSignature',
                  textSignature,
                  data.data
                );
              }
            })
            .catch(function(bytesSignature) {
              TemplateVar.set(template, 'executionFunction', bytesSignature);
              TemplateVar.set(template, 'hasSignature', false);
            });
        }
      }
      if (data.from) {
        web3.eth.getCode(data.from, function(e, res) {
          if (!e && res && res.length > 2) {
            TemplateVar.set(template, 'fromIsContract', true);
          }
        });
      }

      // Estimate gas usage
      TemplateVar.set(template, 'gasLoading', true);

      var estimateData = _.clone(data);
      estimateData.gas = defaultEstimateGas;

      // In case estimateGas fails returning
      // (which seems to be happening in manual testing)
      // We'll set gasLoading back to false after 10s
      // so the user can see an error message
      const gasEstimationFailed = e => {
        console.log(
          'Gas estimation failed. Falling back to max(provided, default) value',
          e
        );
        TemplateVar.set(template, 'gasLoading', false);
        TemplateVar.set(template, 'estimatedGas', defaultEstimateGas);
        TemplateVar.set(
          template,
          'providedGas',
          Math.max(gas, defaultEstimateGas)
        );
      };

      var estimationFailEvent = setTimeout(gasEstimationFailed, 20000);

      web3.eth
        .estimateGas(estimateData)
        .then(function(value, error) {
          clearTimeout(estimationFailEvent);

          console.log('Estimated gas: ', value, error);
          if (!error && value) {
            // set the gas to the estimation, if not provided or lower
            Tracker.nonreactive(function() {
              var gas = Number(TemplateVar.get(template, 'providedGas'));

              if (value === defaultEstimateGas) {
                return TemplateVar.set(template, 'estimatedGas', 'invalid');
              }

              const estimatedGas = web3.utils.toBN(value || 0);
              TemplateVar.set(
                template,
                'estimatedGas',
                estimatedGas.toNumber()
              );

              if (!gas && value) {
                TemplateVar.set(
                  template,
                  'providedGas',
                  estimatedGas.add(web3.utils.toBN(100000)).toNumber()
                );
                TemplateVar.set(
                  template,
                  'initialProvidedGas',
                  estimatedGas.add(web3.utils.toBN(100000)).toNumber()
                );
              }
            });
          } else {
            TemplateVar.set(template, 'estimatedGas', defaultEstimateGas);
            TemplateVar.set(template, 'providedGas', defaultEstimateGas);
          }
          TemplateVar.set(template, 'gasLoading', false);
        })
        .catch(gasEstimationFailed);
    }
  });
});

Template['popupWindows_sendTransactionConfirmation'].onRendered(function() {
  var template = this;

  Meteor.setTimeout(function() {
    template.$('input[type="password"]').focus();
  }, 200);
});

Template['popupWindows_sendTransactionConfirmation'].helpers({
  /**
    Returns the total amount

    @method (totalAmount)
    */
  totalAmount: function() {
    var amount = EthTools.formatBalance(
      web3.utils.toBN(this.value || 0),
      '0,0.00[0000000000000000]',
      'ether'
    );
    var dotPos = ~amount.indexOf('.')
      ? amount.indexOf('.') + 3
      : amount.indexOf(',') + 3;

    return amount
      ? amount.substr(0, dotPos) +
          '<small style="font-size: 0.5em;">' +
          amount.substr(dotPos) +
          '</small>'
      : '0';
  },
  /**
    Calculates the fee used for this transaction in ether

    @method (estimatedFee)
    */
  estimatedFee: function() {
    var gas = TemplateVar.get('estimatedGas');
    if (gas && this.gasPrice) {
      const balance = web3.utils
        .toBN(gas || 0)
        .mul(web3.utils.toBN(this.gasPrice || 0));
      return EthTools.formatBalance(balance, '0,0.0[0000000] unit', 'ether');
    }
  },
  /**
    Calculates the provided gas amount in ether

    @method (providedGas)
    */
  providedGas: function() {
    var gas = TemplateVar.get('providedGas');
    if (gas && this.gasPrice) {
      const balance = web3.utils
        .toBN(gas || 0)
        .mul(web3.utils.toBN(this.gasPrice || 0));
      return EthTools.formatBalance(balance, '0,0.0[0000000]', 'ether');
    }
  },
  /**
    Shortens the address to 0xffff...ffff

    @method (shortenAddress)
    */
  shortenAddress: function(address) {
    if (_.isString(address)) {
      return address.substr(0, 6) + '...' + address.substr(-4);
    }
  },
  /**
    Formats the data so that all zeros are wrapped in span.zero

    @method (formattedData)
    */
  formattedData: function() {
    return TemplateVar.get('toIsContract')
      ? this.data
          .replace(/([0]{2,})/g, '<span class="zero">$1</span>')
          .replace(/(0x[a-f0-9]{8})/i, '<span class="function">$1</span>')
      : this.data.replace(/([0]{2,})/g, '<span class="zero">$1</span>');
  },

  params: function() {
    return TemplateVar.get('params');
  },
  /**
    Formats parameters

    @method (showFormattedParams)
    */
  showFormattedParams: function() {
    return TemplateVar.get('params') && TemplateVar.get('displayDecodedParams');
  },
  /**
    Checks if transaction will be invalid

    @method (transactionInvalid)
    */
  transactionInvalid: function() {
    return (
      TemplateVar.get('estimatedGas') === 'invalid' ||
      TemplateVar.get('estimatedGas') === 0 ||
      typeof TemplateVar.get('estimatedGas') === 'undefined'
    );
  }
});

Template['popupWindows_sendTransactionConfirmation'].events({
  /**
    Gets the new provided gas in ether amount and calculates the resulting providedGas

    @event change .provided-gas, input .provided-gas
    */
  'change .provided-gas, input .provided-gas': function(e, template) {
    var gas = template
      .$('.provided-gas')
      .text()
      .replace(/[, ]+/g, ''); // template.$('.provided-gas').text();

    TemplateVar.set('providedGas', gas);
  },
  /**
    Increase the estimated gas

    @event click .not-enough-gas
    */
  'click .not-enough-gas': function() {
    const gas = web3.utils
      .toBN(TemplateVar.get('estimatedGas') || 0)
      .add(web3.utils.toBN(100000))
      .toNumber();
    TemplateVar.set('initialProvidedGas', gas);
    TemplateVar.set('providedGas', gas);
  },
  /**
    Cancel the transaction confirmation and close the popup

    @event click .cancel
    */
  'click .cancel': function() {
    ipc.send(
      'backendAction_unlockedAccountAndSentTransaction',
      'Transaction not confirmed'
    );
    ipc.send('backendAction_closePopupWindow');
  },
  /**
    Confirm the transaction

    @event submit form
    */
  'submit form': async function(e, template) {
    e.preventDefault();

    var data = Session.get('data'),
      pw = template.find('input[type="password"]').value,
      gas = web3.utils.numberToHex(TemplateVar.get('providedGas'));

    // check if account is about to send to itself
    if (data.to && data.from === data.to.toLowerCase()) {
      GlobalNotification.warning({
        content: TAPi18n.__(
          'mist.popupWindows.sendTransactionConfirmation.errors.sameAccount'
        ),
        duration: 5
      });

      return false;
    }

    console.log('Choosen Gas: ', gas, TemplateVar.get('providedGas'));

    if (!gas || !_.isFinite(gas)) {
      return;
    } else {
      data.gas = gas;
    }

    TemplateVar.set('unlocking', true);

    // get nonce
    const nonce = await web3.eth.getTransactionCount(data.from);
    const tx = Object.assign({}, data, {
      nonce: `0x${nonce.toString(16)}`
    });

    var signedTx;

    // sign transaction
    await web3.eth.personal.signTransaction(tx, pw || '', function(
      error,
      result
    ) {
      pw = null;
      if (error) {
        TemplateVar.set(template, 'unlocking', false);
        console.log(error);
        Tracker.afterFlush(function() {
          template.find('input[type="password"]').value = '';
          template.$('input[type="password"]').focus();
        });
        if (error.message.includes('Unable to connect to socket: timeout')) {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.sendTransactionConfirmation.errors.connectionTimeout'
            ),
            duration: 5
          });
        } else if (
          error.message.includes('could not decrypt key with given passphrase')
        ) {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.sendTransactionConfirmation.errors.wrongPassword'
            ),
            duration: 3
          });
        } else if (error.message.includes('multiple keys match address')) {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.sendTransactionConfirmation.errors.multipleKeysMatchAddress'
            ),
            duration: 10
          });
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

    if (!signedTx) {
      console.log('Error: no signedTx');
      TemplateVar.set(template, 'unlocking', false);
      return;
    }

    // send transaction!
    web3.eth.sendSignedTransaction(signedTx, (error, hash) => {
      TemplateVar.set(template, 'unlocking', false);
      if (error) {
        console.error(`Error from sendSignedTransaction: ${error}`);
        if (error.message.includes('Unable to connect to socket: timeout')) {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.sendTransactionConfirmation.errors.connectionTimeout'
            ),
            duration: 5
          });
        } else if (
          error.message.includes('Insufficient funds for gas * price + value')
        ) {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.sendTransactionConfirmation.errors.insufficientFundsForGas'
            ),
            duration: 5
          });
        } else {
          GlobalNotification.warning({
            content: error.message || error,
            duration: 5
          });
        }
        return;
      }
      ipc.send('backendAction_unlockedAccountAndSentTransaction', null, hash);
    });
    // In case sendSignedTransaction doesn't return,
    // after 75s we'll reset the form so at least
    // they can try again.
    setTimeout(() => {
      TemplateVar.set(template, 'unlocking', false);
    }, 75000);
  },

  'click .data .toggle-panel': function() {
    TemplateVar.set('displayDecodedParams', true);
  },
  'click .parameters .toggle-panel': function() {
    TemplateVar.set('displayDecodedParams', false);
  },
  'click .lookup-function-signature': function(e, template) {
    var data = Session.get('data');
    TemplateVar.set('lookingUpFunctionSignature', true);

    remoteSignatureLookup(data.data)
      .then(function(textSignature) {
        TemplateVar.set(template, 'lookingUpFunctionSignature', false);

        // Clean version of function signature. Striping params
        TemplateVar.set(
          template,
          'executionFunction',
          textSignature.replace(/\(.+$/g, '')
        );
        TemplateVar.set(template, 'hasSignature', true);

        var params = textSignature.match(/\((.+)\)/i);
        if (params) {
          console.log('params:', params);
          TemplateVar.set(template, 'executionFunctionParamTypes', params);
          ipc.send(
            'backendAction_decodeFunctionSignature',
            textSignature,
            data.data
          );
        }
      })
      .catch(function(bytesSignature) {
        TemplateVar.set(template, 'lookingUpFunctionSignature', false);
        TemplateVar.set(template, 'executionFunction', bytesSignature);
        TemplateVar.set(template, 'hasSignature', false);
      });
  }
});
/**
Set TemplateVar 'network'
@method setNetwork
*/
var setNetwork = function(template) {
  TemplateVar.set(template, 'network', store.getState().nodes.network);

  this.storeUnsubscribe = store.subscribe(() => {
    if (
      store.getState().nodes.network !== TemplateVar.get(template, 'network')
    ) {
      TemplateVar.set(template, 'network', store.getState().nodes.network);
    }
  });
};
