import React, { Component } from 'react';

class Data extends Component {
  render() {
    if (this.props.data) {
      return null;
    }

    if (this.props.showFormattedParams) {
      return (
        <div className="parameters">
          <h3>
            {i18n.t('mist.popupWindows.sendTransactionConfirmation.parameters')}
            <a href="#" className="toggle-panel">
              {i18n.t(
                'mist.popupWindows.sendTransactionConfirmation.showRawBytecode'
              )}
            </a>
          </h3>
          <ol>
            {/*}
              {{# each param in params}}
                  <li>{{> dapp_output output=param }}</li>
              {{/each}}
            */}
          </ol>
        </div>
      );
    }

    return (
      <div className="data">
        <h3>{i18n.t('mist.popupWindows.sendTransactionConfirmation.data')}</h3>
      </div>

      //  <div class="data">
      //      <h3>{{i18n "mist.popupWindows.sendTransactionConfirmation.data"}}

      //      {{# if params}}
      //          <a href="#" class="toggle-panel">{{i18n "mist.popupWindows.sendTransactionConfirmation.showDecodedParameters"}}</a>
      //      {{else}}
      //          {{#if to}}
      //              {{#unless (TemplateVar.get "lookingUpFunctionSignature")}}
      //                  <a class="lookup-function-signature simptip-position-bottom simptip-movable" data-tooltip="{{i18n 'mist.popupWindows.sendTransactionConfirmation.lookupDataExplainer'}}"> {{i18n "mist.popupWindows.sendTransactionConfirmation.lookupData"}}
      //                  </a>
      //              {{/unless}}
      //          {{/if}}
      //      {{/if}}
      //      </h3>

      //      <pre>{{{formattedData}}}</pre>
      //  </div>
    );
  }
}

export default Data;
