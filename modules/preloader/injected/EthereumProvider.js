const origin = this.origin;

(function() {
  class EthereumProvider extends window.EventEmitter {
    constructor() {
      // Call super for `this` to be defined
      super();

      // Init storage
      this._isConnected = false;
      this._nextJsonrpcId = 0;
      this._promises = {};
      this._activeSubscriptions = [];

      // Fire the connect
      this._connect();

      // Listen for jsonrpc responses
      window.addEventListener('message', this._handleJsonrpcMessage.bind(this));
    }

    /* Methods */

    enable() {
      return new Promise((resolve, reject) => {
        window.mist
          .requestAccounts()
          .then(resolve)
          .catch(reject);
      });
    }

    send(method, params = []) {
      if (!method || typeof method !== 'string') {
        return new Error('Method is not a valid string.');
      }

      if (!(params instanceof Array)) {
        return new Error('Params is not a valid array.');
      }

      const id = this._nextJsonrpcId++;
      const jsonrpc = '2.0';
      const payload = { jsonrpc, id, method, params };

      const promise = new Promise((resolve, reject) => {
        this._promises[payload.id] = { resolve, reject };
      });

      // Send jsonrpc request to node
      window.postMessage(
        { type: 'mistAPI_ethereum_provider_write', message: payload },
        origin
      );

      return promise;
    }

    subscribe(subscriptionType, params) {
      return this.send('eth_subscribe', [subscriptionType, ...params]).then(
        subscriptionId => {
          this._activeSubscriptions.push(subscriptionId);
        }
      );
    }

    unsubscribe(subscriptionId) {
      return this.send('eth_unsubscribe', [subscriptionId]).then(success => {
        if (success) {
          // Remove subscription
          this._activeSubscription = this._activeSubscription.filter(
            id => id !== subscriptionId
          );
          // Remove listeners on subscriptionId
          this.removeAllListeners(subscriptionId);
        }
      });
    }

    /* Internal methods */

    _handleJsonrpcMessage(event) {
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
        const promise = this._promises[id];
        if (promise) {
          // Handle pending promise
          if (data.type === 'error') {
            promise.reject(message);
          } else if (message.error) {
            promise.reject(error);
          } else {
            promise.resolve(result);
          }
          delete this._promises[id];
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
      // Send to node
      window.postMessage({ type: 'mistAPI_ethereum_provider_connect' }, origin);

      // Reconnect on close
      this.once('close', this._connect.bind(this));
    }

    /* Events */

    _emitConnect() {
      this._isConnected = true;
      this.emit('connect');
    }

    _emitClose(code, reason) {
      this._isConnected = false;
      this.emit('close', code, reason);

      // Send Error objects to any open subscriptions
      this._activeSubscriptions.forEach(id => {
        const error = new Error(
          `Provider connection to network closed.
           Subscription lost, please subscribe again.`
        );
        this.emit(id, error);
      });
      // Clear subscriptions
      this._activeSubscriptions = [];
    }

    _emitNetworkChanged(networkId) {
      this.emit('networkChanged', networkId);
    }

    _emitAccountsChanged(accounts) {
      this.emit('accountsChanged', accounts);
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
          // eslint-disable-next-line no-console
          console.error(
            `Error from EthereumProvider sendAsync ${payload}: ${error}`
          );
        });
    }

    isConnected() {
      return this._isConnected;
    }

    /* Deprecated methods */

    sendSync() {
      return new Error('Sync calls are not supported.');
    }

    sendBatch() {
      return new Error('Batch calls are not supported.');
    }
  }

  window.ethereum = new EthereumProvider();
})();
