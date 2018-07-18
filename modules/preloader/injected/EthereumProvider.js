const origin = this.origin;

(function() {
  // Request accounts from Mist on provider request
  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'ETHEREUM_PROVIDER_REQUEST') {
      window.mist
        .requestAccounts()
        .then(() => {
          window.ethereum = new EthereumProvider();
          window.postMessage({ type: 'ETHEREUM_PROVIDER_SUCCESS' }, origin);
        })
        .catch(error => {
          console.error(`Error from Mist requestAccounts: ${error}`); // eslint-disable-line no-console
          return;
        });
    }
  });

  class EthereumProvider extends window.EventEmitter {
    constructor() {
      // Call super for `this` to be defined
      super();

      // Init storage
      this.nextJsonrpcId = 0;
      this.responsePromises = {};
      this.activeSubscriptionIds = [];

      // Fire the connect
      this._connect();

      // Listen for jsonrpc responses
      window.addEventListener('message', this._handleMessage.bind(this));
    }

    /* Methods */

    send(method, params = []) {
      if (!method || typeof method !== 'string') {
        return new Error('Given method is not a valid string.');
      }

      if (!(params instanceof Array)) {
        return new Error('Given params is not a valid array.');
      }

      const payload = {
        id: this.nextJsonrpcId++,
        jsonrpc: '2.0',
        method,
        params
      };

      const promise = new Promise((resolve, reject) => {
        this.responsePromises[payload.id] = { resolve, reject };
      });

      window.postMessage({ type: 'write', message: payload }, origin);

      return promise;
    }

    subscribe(subscriptionType, params) {
      return this.send('eth_subscribe', [subscriptionType, ...params]).then(
        subscriptionId => {
          this.activeSubscriptionIds.push(subscriptionId);
        }
      );
    }

    unsubscribe(subscriptionId) {
      return this.send('eth_unsubscribe', [subscriptionId]).then(success => {
        if (success) {
          // Remove subscriptionId from activeSubscriptionIds
          this.activeSubscriptionIds = this.activeSubscriptionIds.filter(
            id => id !== subscriptionId
          );
          // Remove listeners on subscriptionId
          this.removeAllListeners(subscriptionId);
        }
      });
    }

    /* Internal methods */

    _handleMessage(event) {
      // Return if no data to parse
      if (!event || !event.data) {
        return;
      }

      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        // Return if we can't parse a valid object
        return;
      }

      // Return if not a jsonrpc response
      if (!data || !data.message || !data.message.jsonrpc) {
        return;
      }

      const message = data.message;
      const { id, method, error, result } = message;

      if (typeof id !== 'undefined') {
        const promise = this.responsePromises[id];
        if (promise) {
          // Handle pending promise
          if (data.type === 'error') {
            promise.reject(message);
          } else if (message.error) {
            promise.reject(error);
          } else {
            promise.resolve(result);
          }
          delete this.responsePromises[id];
        }
      } else {
        if (method && method.indexOf('_subscription') > -1) {
          // Emit subscription result
          const { subscription, result } = message.params;
          this.emit(subscription, result);
        }
      }
    }

    /* Connection handling */

    _connect() {
      window.postMessage({ type: 'create' }, origin);

      // Reconnect on close
      // this.on('close', this._connect);
    }

    /* Events */

    _emitConnect() {
      this.emit('connect');
    }

    _emitClose(code, reason) {
      this.emit('close', code, reason);

      // Send Error objects to any open subscriptions
      this.activeSubscriptionIds.forEach(id => {
        const error = new Error(
          `Provider connection to network closed.
           Subscription lost, please subscribe again.`
        );
        this.emit(id, error);
      });
      // Clear subscriptions
      this.activeSubscriptionIds = [];
    }

    _emitNetworkChanged(networkId) {
      this.emit('networkChanged', networkId);
    }

    _emitAccountsChanged(accounts) {
      this.emit('accountsChanged', accounts);
    }

    /* Deprecated methods */

    sendSync() {
      return new Error('Sync calls are not supported.');
    }

    sendBatch() {
      return new Error('Batch calls are not supported.');
    }

    /* web3.js provider compatibility */

    sendAsync(payload, callback) {
      return this.send(payload.method, payload.params)
        .then(result => {
          const response = payload;
          response.result = result;
          callback(null, response);
        })
        .catch(error => {
          callback(error, null);
          console.error(`Error from sendAsync ${payload}: ${error}`); // eslint-disable-line no-console
        });
    }

    isConnected() {
      return true;
    }
  }
})();
