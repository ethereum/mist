/**
The IPC provider backend filter and tunnel all incoming request to the ethereum node.

@module ipcProviderBackend
*/

const _ = require('../utils/underscore.js');
const Q = require('bluebird');
const { ipcMain: ipc } = require('electron');
const fs = require('fs');
const path = require('path');

const log = require('../utils/logger').create('ipcProviderBackend');
const Sockets = require('../socketManager');
const Settings = require('../settings');
const ethereumNode = require('../ethereumNode');
const ethereumNodeRemote = require('../ethereumNodeRemote');

const ERRORS = {
  INVALID_PAYLOAD: {
    code: -32600,
    message:
      "Payload, or some of its content properties are invalid. Please check if they are valid HEX with '0x' prefix."
  },
  METHOD_DENIED: { code: -32601, message: 'Method __method__ not allowed.' },
  METHOD_TIMEOUT: {
    code: -32603,
    message: 'Request timed out for method __method__.'
  },
  TX_DENIED: { code: -32603, message: 'Transaction denied' },
  BATCH_TX_DENIED: {
    code: -32603,
    message:
      'Transactions denied, sendTransaction is not allowed in batch requests.'
  },
  BATCH_COMPILE_DENIED: {
    code: -32603,
    message:
      'Compilation denied, compileSolidity is not allowed in batch requests.'
  },
  SOCKET_NOT_CONNECTED: {
    code: -32604,
    message: 'Socket not connected when trying to send method __method__.'
  }
};

/**
 * IPC provider backend.
 */
class IpcProviderBackend {
  constructor() {
    this._connections = {};

    this.ERRORS = ERRORS;

    ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));

    ipc.on('ipcProvider-create', _.bind(this._getOrCreateConnection, this));
    ipc.on('ipcProvider-destroy', _.bind(this._destroyConnection, this));
    ipc.on('ipcProvider-write', _.bind(this._sendRequest, this, false));
    ipc.on('ipcProvider-writeSync', _.bind(this._sendRequest, this, true));

    this._connectionPromise = {};

    // dynamically load in method processors
    const processors = fs.readdirSync(path.join(__dirname, 'methods'));

    // get response processors
    this._processors = {};
    processors.forEach(p => {
      const name = path.basename(p, '.js');

      const PClass = require(path.join(__dirname, 'methods', p));

      this._processors[name] = new PClass(name, this);
    });

    log.trace('Loaded processors', _.keys(this._processors));

    store.dispatch({ type: '[MAIN]:IPC_PROVIDER_BACKEND:INIT' });

    // Store remote subscriptions.
    // > key: local subscription id
    // > value: remote subscription id
    this._remoteSubscriptions = {};
    // Store subscription owners for sending remote results
    // > key: local subscription id
    // > value: connection ownerId
    this._subscriptionOwners = {};
  }

  /**
   * Get/create new connection to node.
   * @return {Promise}
   */
  _getOrCreateConnection(event) {
    const owner = event.sender;
    const ownerId = owner.id;

    let socket;

    return Q.try(() => {
      // already got?
      if (this._connections[ownerId]) {
        socket = this._connections[ownerId].socket;
      } else {
        log.debug(`Create new socket connection, id=${ownerId}`);

        socket = Sockets.get(ownerId, Settings.rpcMode);
      }
    })
      .then(() => {
        if (!this._connections[ownerId]) {
          // save to collection
          this._connections[ownerId] = {
            id: ownerId,
            owner,
            socket
          };

          // if something goes wrong destroy the socket
          ['error', 'timeout', 'end'].forEach(ev => {
            socket.on(ev, data => {
              log.debug(
                `Destroy socket connection due to event: ${ev}, id=${ownerId}`
              );

              socket.destroy().finally(() => {
                if (!owner.isDestroyed()) {
                  owner.send(`ipcProvider-${ev}`, JSON.stringify(data));
                }
              });

              delete this._connections[ownerId];
              Sockets.remove(ownerId);
            });
          });

          socket.on('connect', data => {
            if (!owner.isDestroyed()) {
              owner.send('ipcProvider-connect', JSON.stringify(data));
            }
          });

          // pass notifications back up the chain
          socket.on('data-notification', data => {
            log.trace('Notification received', ownerId, data);

            if (data.error) {
              data = this._makeErrorResponsePayload(data, data);
            } else {
              data = this._makeResponsePayload(data, data);
            }

            if (!owner.isDestroyed()) {
              owner.send('ipcProvider-data', JSON.stringify(data));
            }
          });
        }
      })
      .then(() => {
        if (!socket.isConnected) {
          // since we may enter this function multiple times for the same
          // event source's IPC we don't want to repeat the connection
          // process each time - so let's track things in a promise
          if (!this._connectionPromise[ownerId]) {
            this._connectionPromise[ownerId] = Q.try(() => {
              log.debug(`Connecting socket ${ownerId}`);

              // wait for node to connect first.
              if (ethereumNode.state !== ethereumNode.STATES.CONNECTED) {
                return new Q((resolve, reject) => {
                  const onStateChange = newState => {
                    if (ethereumNode.STATES.CONNECTED === newState) {
                      ethereumNode.removeListener('state', onStateChange);

                      log.debug(
                        `Ethereum node connected, resume connecting socket ${ownerId}`
                      );

                      resolve();
                    }
                  };

                  ethereumNode.on('state', onStateChange);
                });
              }
            })
              .then(() => {
                return socket.connect(
                  Settings.rpcConnectConfig,
                  {
                    timeout: 5000
                  }
                );
              })
              .then(() => {
                log.debug(`Socket connected, id=${ownerId}`);
              })
              .finally(() => {
                delete this._connectionPromise[ownerId];
              });
          }

          return this._connectionPromise[ownerId];
        }
      })
      .then(() => {
        if (!owner.isDestroyed()) {
          owner.send('ipcProvider-setWritable', true);
        }

        return this._connections[ownerId];
      });
  }

  /**
   * Handle IPC call to destroy a connection.
   */
  _destroyConnection(event) {
    const ownerId = event.sender.id;

    if (this._connections[ownerId]) {
      log.debug('Destroy socket connection', ownerId);

      this._connections[ownerId].owner.send('ipcProvider-setWritable', false);

      this._connections[ownerId].socket.destroy();
      delete this._connections[ownerId];
      Sockets.remove(ownerId);
    }
  }

  /**
   * Handler for when Ethereum node state changes.
   *
   * Auto-reconnect sockets when ethereum node state changes
   *
   * @param {String} state The new state.
   */
  _onNodeStateChanged(state) {
    switch (
      state // eslint-disable-line default-case
    ) {
      // stop syncing when node about to be stopped
      case ethereumNode.STATES.STOPPING:
        log.info('Ethereum node stopping, disconnecting sockets');

        // Unsubscribe remote subscriptions
        _.each(this._remoteSubscriptions, remoteSubscriptionId => {
          ethereumNodeRemote.send('eth_unsubscribe', [remoteSubscriptionId]);
        });
        this._remoteSubscriptions = {};
        this._subscriptionOwners = {};

        Q.all(
          _.map(this._connections, item => {
            if (item.socket.isConnected) {
              return item.socket.disconnect().then(() => {
                log.debug(
                  `Tell owner ${item.id} that socket is not currently writeable`
                );

                item.owner.send('ipcProvider-setWritable', false);
              });
            }
            return Q.resolve();
          })
        ).catch(err => {
          log.error('Error disconnecting sockets', err);
        });

        break;
    }
  }

  /**
   * Handle IPC call to send a request.
   * @param  {Boolean} isSync  whether request is sync.
   * @param  {Object}  event   IPC event.
   * @param  {String}  payload request payload.
   * @param  {Boolean} retry   whether trying request again due to error
   */
  _sendRequest(isSync, event, payload, retry = false) {
    const ownerId = event.sender.id;

    log.trace('sendRequest', isSync ? 'sync' : 'async', ownerId, payload);

    const originalPayloadStr = payload;

    return Q.try(() => {
      // overwrite playload var with parsed version
      payload = JSON.parse(originalPayloadStr);

      return this._getOrCreateConnection(event);
    })
      .then(conn => {
        // reparse original string (so that we don't modify input payload)
        const finalPayload = JSON.parse(originalPayloadStr);

        // is batch?
        const isBatch = _.isArray(finalPayload);
        const finalPayloadList = isBatch ? finalPayload : [finalPayload];

        if (!conn.socket.isConnected) {
          const error = Object.assign({}, this.ERRORS.SOCKET_NOT_CONNECTED, {
            message: this.ERRORS.SOCKET_NOT_CONNECTED.message.replace(
              '__method__',
              finalPayloadList.map(p => p.method).join(', ')
            )
          });
          // Try again if not already a retry
          if (!retry) {
            error.message += ' Will retry...';
            setTimeout(() => {
              this._sendRequest(isSync, event, originalPayloadStr, true);
            }, 2000);
          }
          log.debug(error);
          throw error;
        }

        // sanitize each and every request payload
        _.each(finalPayloadList, p => {
          const processor = this._processors[p.method]
            ? this._processors[p.method]
            : this._processors.base;

          processor.sanitizeRequestPayload(conn, p, isBatch);
        });

        // if a single payload and has an error then throw it
        if (!isBatch && finalPayload.error) {
          throw finalPayload.error;
        }

        // get non-error payloads
        const nonErrorPayloads = _.filter(finalPayloadList, p => !p.error);

        // execute non-error payloads
        return Q.try(() => {
          if (nonErrorPayloads.length) {
            // if single payload check if we have special processor for it
            // if not then use base generic processor
            const processor = this._processors[finalPayload.method]
              ? this._processors[finalPayload.method]
              : this._processors.base;

            return processor.exec(
              conn,
              isBatch ? nonErrorPayloads : nonErrorPayloads[0]
            );
          } else {
            return [];
          }
        }).then(ret => {
          log.trace('Got result', ret);

          let finalResult = [];

          // collate results
          _.each(finalPayloadList, p => {
            if (p.error) {
              finalResult.push(p);
            } else {
              p = _.extend({}, p, isBatch ? ret.shift() : ret);

              const processor = this._processors[p.method]
                ? this._processors[p.method]
                : this._processors.base;

              // sanitize response payload
              processor.sanitizeResponsePayload(conn, p, isBatch);

              // if subscription, save connection ownerId for sending responses later
              if (p.method === 'eth_subscribe') {
                const subscriptionId = p.result;
                if (subscriptionId) {
                  this._subscriptionOwners[subscriptionId] = ownerId;
                }
              }

              finalResult.push(p);
            }
          });

          // extract single payload result
          if (!isBatch) {
            finalResult = finalResult.pop();

            // check if it's an error
            if (finalResult.error) {
              throw finalResult.error;
            }
          }

          return finalResult;
        });
      })
      .then(result => {
        log.trace('Got result', result);
        return this._makeResponsePayload(payload, result);
      })
      .catch(err => {
        log.error('Send request failed', err);

        err = this._makeErrorResponsePayload(payload || {}, {
          message: typeof err === 'string' ? err : err.message,
          code: err.code
        });

        return err;
      })
      .then(returnValue => {
        returnValue = JSON.stringify(returnValue);

        log.trace('Return', ownerId, returnValue);

        if (isSync) {
          event.returnValue = returnValue;
        } else if (!event.sender.isDestroyed()) {
          event.sender.send('ipcProvider-data', returnValue);
        }
      });
  }

  /**
    Sanitize a single or batch request payload.

    This will modify the passed-in payload.

    @param {Object} conn The connection.
    @param {Object|Array} payload The request payload.
    */
  _sanitizeRequestPayload(conn, payload) {
    if (_.isArray(payload)) {
      _.each(payload, p => {
        if (p.method === 'eth_sendTransaction') {
          p.error = ERRORS.BATCH_TX_DENIED;
        } else {
          this._processors.base.sanitizePayload(conn, p);
        }
      });
    } else {
      this._processors.base.sanitizePayload(conn, payload);
    }
  }

  /**
    Make an error response payload

    @param {Object|Array} originalPayload Original payload
    @param {Object} error Error result
    */
  _makeErrorResponsePayload(originalPayload, error) {
    const e = [].concat(originalPayload).map(item => {
      const e = _.extend(
        {
          jsonrpc: '2.0'
        },
        error
      );

      if (e.message) {
        if (_.isArray(e.message)) {
          e.message = e.message.pop();
        }

        e.error = {
          code: e.code,
          message: e.message.replace(/'[a-z_]*'/i, `'${item.method}'`)
        };

        delete e.code;
        delete e.message;
      }

      // delete stuff leftover from request
      delete e.params;
      delete e.method;

      e.id = item.id;

      return e;
    });

    return _.isArray(originalPayload) ? e : e[0];
  }

  /**
    Make a response payload.

    @param {Object|Array} originalPayload Original payload
    @param {Object|Array} value Response results.

    @method makeReturnValue
    */
  _makeResponsePayload(originalPayload, value) {
    const finalValue = _.isArray(originalPayload) ? value : [value];

    const allResults = [].concat(originalPayload).map((item, idx) => {
      const finalResult = finalValue[idx];

      let ret;

      // handle error result
      if (finalResult.error) {
        ret = this._makeErrorResponsePayload(item, finalResult.error);
      } else {
        ret = _.extend({}, item, {
          result: finalResult.result
        });
      }

      ret = this._handleSubscriptions(ret);

      if (ret) {
        if (item.id) {
          delete ret.params;
          delete ret.method;
        }
        ret.jsonrpc = '2.0';
      }

      return ret;
    });

    return _.isArray(originalPayload) ? allResults : allResults[0];
  }

  /**
    Handles eth_subscribe|eth_subscription|eth_unsubscribe to:
    1. Create a remote subscription when created on local (except syncing subscriptions)
    2. Send remote subscription result if on remote (with remote subscription id swapped for local id)
    3. Ignore local subscription result if on remote
    4. Unsubscribe remote subscription when unsubscribing local subscription

    @param {Object} result
    @return {Object} result
    */
  _handleSubscriptions(result) {
    if (result.method === 'eth_subscribe') {
      // If subscription is created in local, also create the subscription in remote
      const subscriptionType = result.params[0];
      const subscriptionId = result.result;

      // Create subscription in remote node
      this._remoteSubscriptions[subscriptionId] = this._subscribeRemote(
        subscriptionId,
        result.params
      );
    }

    if (result.method === 'eth_subscription') {
      // Skip if syncing result
      if (result.params.result.syncing) {
        return result;
      }

      // If remote node is active, cancel propogating response
      // since we'll return the remote response instead
      if (store.getState().nodes.active === 'remote') {
        log.trace(
          `Ignoring local subscription result (remote node is active). subscription id: ${
            result.params.subscription
          }`
        );
        return null;
      } else {
        log.trace(
          `Sending local subscription result (local node is active). subscription id: ${
            result.params.subscription
          }`
        );
        return result;
      }
    }

    if (result.method === 'eth_unsubscribe') {
      const subscriptionId = result.params[0];
      const localSubscriptionId = this._remoteSubscriptions[subscriptionId];
      if (localSubscriptionId) {
        ethereumNodeRemote.send('eth_unsubscribe', [localSubscriptionId]);
        delete this._remoteSubscriptions[subscriptionId];
        delete this._subscriptionOwners[subscriptionId];
      }
    }

    return result;
  }

  /**
    Creates a subscription in remote node and
    sends results down the pipe if remote node is active

    @param {Object}  params - Subscription params
    @param {Boolean} retry  - Is this request a retry
    */
  _subscribeRemote(localSubscriptionId, params, retry = false) {
    return new Promise(async (resolve, reject) => {
      log.trace(
        `Creating remote subscription: ${params} (local subscription id: ${localSubscriptionId})`
      );

      var remoteSubscriptionId;
      const requestId = await ethereumNodeRemote.send('eth_subscribe', params);

      if (!requestId) {
        log.error('No return id for request');
        return;
      }

      const callback = data => {
        if (!data) {
          return;
        }

        try {
          data = JSON.parse(data);
        } catch (error) {
          log.trace('Error parsing data: ', data);
        }

        if (data.id === requestId && data.result) {
          if (data.result) {
            remoteSubscriptionId = data.result;
            resolve(remoteSubscriptionId);
          }
        }

        if (
          data.params &&
          data.params.subscription &&
          data.params.subscription === remoteSubscriptionId
        ) {
          this._sendRemoteResult(localSubscriptionId, data.params.result);
        }
      };

      ethereumNodeRemote.ws.on('message', callback);
    });
  }

  _sendRemoteResult(localSubscriptionId, remoteResult) {
    if (store.getState().nodes.active === 'remote') {
      // Set up object to send
      const res = {
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          result: remoteResult,
          subscription: localSubscriptionId
        }
      };

      const owner =
        this._subscriptionOwners[localSubscriptionId] &&
        this._connections[this._subscriptionOwners[localSubscriptionId]]
          ? this._connections[this._subscriptionOwners[localSubscriptionId]]
              .owner
          : null;

      if (!owner) {
        log.trace('No owner to send result', res);
      } else if (owner.isDestroyed()) {
        log.trace('Owner to send result already destroyed', res);
      } else {
        log.trace(
          `Sending remote subscription result (remote node is active)`,
          res
        );
        owner.send('ipcProvider-data', JSON.stringify(res));
      }
    }
  }
}

exports.init = () => {
  return new IpcProviderBackend();
};
