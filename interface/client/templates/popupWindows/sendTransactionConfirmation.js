/**
Template Controllers

@module Templates
*/

var setWindowSize = function(template){
    Tracker.afterFlush(function(){
        ipc.send('backendAction_setWindowSize', 580, template.$('.popup-windows').height() + 60);
    });
}


var defaultEstimateGas  = 50000000;

/**
The sendTransaction confirmation popup window template

@class [template] popupWindows_sendTransactionConfirmation
@constructor
*/

Template['popupWindows_sendTransactionConfirmation'].onCreated(function(){
    var template = this;

    this.autorun(function(){

        var data = Session.get('data');

        if(data) {

            // set window size
            setWindowSize(template);

            // set provided gas to templateVar
            TemplateVar.set('providedGas', data.gas || 0);
            TemplateVar.set('initialProvidedGas', data.gas || 0);

            // add gasPrice if not set
            if(!data.gasPrice) {
                web3.eth.getGasPrice(function(e, res){
                    if(!e) {
                        data.gasPrice = '0x'+ res.toString(16);
                        Session.set('data', data);
                    }
                });
            }

            // check if to is a contract
            if(data.to) {
                web3.eth.getCode(data.to, function(e, res){
                    if(!e && res && res.length > 2) {
                        TemplateVar.set(template, 'toIsContract', true);
                        setWindowSize(template);
                    }
                });
            }
            if(data.from) {
                web3.eth.getCode(data.from, function(e, res){
                    if(!e && res && res.length > 2) {
                        TemplateVar.set(template, 'fromIsContract', true);
                    }
                });
            }


            // esitmate gas usage
            var estimateData = _.clone(data);
            estimateData.gas = defaultEstimateGas;
            web3.eth.estimateGas(estimateData, function(e, res){
                console.log('Estimated gas: ', res, e);
                if(!e && res) {
                    Tracker.nonreactive(function(){

                        if(defaultEstimateGas === res)
                            return TemplateVar.set(template, 'estimatedGas', 'invalid');
                        else
                            TemplateVar.set(template, 'estimatedGas', res);

                        // set the gas to the estimation, if not provided or lower
                        var gas = TemplateVar.get(template, 'providedGas');

                        if(gas == 0) {
                            TemplateVar.set(template, 'providedGas', res + 100000);
                            TemplateVar.set(template, 'initialProvidedGas', res + 100000);
                        }
                    });
                }
            });
        }
    });
});

Template['popupWindows_sendTransactionConfirmation'].onRendered(function(){
    this.$('input[type="password"]').focus();
});

Template['popupWindows_sendTransactionConfirmation'].helpers({
    /**
    Returns the total amount

    @method (totalAmount)
    */
    'totalAmount': function(){
        var amount = EthTools.formatBalance(this.value, '0,0.00[0000000000000000]', 'ether');
        var dotPos = (~amount.indexOf('.')) ? amount.indexOf('.') + 3 : amount.indexOf(',') + 3;

        return amount ? amount.substr(0, dotPos) + '<small style="font-size: 0.5em;">'+ amount.substr(dotPos) +'</small>' : '0';
    },
    /**
    Calculates the fee used for this transaction in ether

    @method (estimatedFee)
    */
    'estimatedFee': function() {
        var gas =  TemplateVar.get('estimatedGas');
        if(gas && this.gasPrice)
            return EthTools.formatBalance(new BigNumber(gas, 10).times(new BigNumber(this.gasPrice, 10)), '0,0.0[0000000] unit', 'ether');
    },
    /**
    Calculates the provided gas amount in ether

    @method (providedGas)
    */
    'providedGas': function() {
        var gas =  TemplateVar.get('providedGas');
        if(gas && this.gasPrice)
            return EthTools.formatBalance(new BigNumber(gas, 10).times(new BigNumber(this.gasPrice, 10)), '0,0.0[0000000]', 'ether');
    },
    /**
    Shortens the address to 0xffff...ffff

    @method (shortenAddress)
    */
    'shortenAddress': function(address){
        if(_.isString(address)) {
            return address.substr(0,6) +'...'+ address.substr(-4);
        }
    },
    /**
    Checks if its a contract execution and returns the execution function

    @method (executionFunction)
    */
    'executionFunction': function(){
        if(TemplateVar.get('toIsContract') && this.data && this.data.length > 8) {
            return (this.data.substr(0,2) === '0x')
                ? this.data.substr(0, 10)
                : '0x'+ this.data.substr(0, 8);
        }
    },
    /**
    Formats the data so that all zeros are wrapped in span.zero

    @method (formattedData)
    */
    'formattedData': function(){
        return (TemplateVar.get('toIsContract'))
            ? this.data.replace(/([0]{2,})/g,'<span class="zero">$1</span>').replace(/(0x[a-f0-9]{8})/i,'<span class="function">$1</span>')
            : this.data.replace(/([0]{2,})/g,'<span class="zero">$1</span>');
    }
});

Template['popupWindows_sendTransactionConfirmation'].events({
    /**
    Gets the new provided gas in ether amount and calculates the resulting providedGas

    @event change .provided-gas, input .provided-gas
    */
    'change .provided-gas, input .provided-gas': function(e, template){
        var gas =  template.$('.provided-gas').text().replace(/[, ]+/g,'');//template.$('.provided-gas').text();

        TemplateVar.set('providedGas', gas);
    },
    /**
    Cancel the transaction confirmation and close the popup

    @event click .cancel
    */
    'click .cancel': function(){
        ipc.send('backendAction_unlockedAccount', 'Transaction not confirmed');
        ipc.send('backendAction_closePopupWindow');
    },
    /**
    Confirm the transaction

    @event submit form
    */
   'submit form': function(e, template){
        e.preventDefault();
        
        var pw = template.find('input[type="password"]').value,
            gas = web3.fromDecimal(TemplateVar.get('providedGas'));

        console.log('Choosen Gas: ', gas, TemplateVar.get('providedGas'));

        if(!gas || !_.isFinite(gas))
            return;

        TemplateVar.set('unlocking', true);
        web3.personal.unlockAccount(Session.get('data').from, pw || '', 2, function(e, res){
            pw = null;
            TemplateVar.set(template, 'unlocking', false);

            if(!e && res) {
                ipc.send('backendAction_unlockedAccount', null, gas);

            } else {
                Tracker.afterFlush(function(){
                    template.find('input[type="password"]').value = '';
                    template.$('input[type="password"]').focus();
                });

                if(e.message.indexOf('CONNECTION ERROR') !== -1) {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.sendTransactionConfirmation.errors.connectionTimeout'),
                        duration: 3
                    });
                } else {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.sendTransactionConfirmation.errors.wrongPassword'),
                        duration: 3
                    });
                }
            }
        });
   } 
});
