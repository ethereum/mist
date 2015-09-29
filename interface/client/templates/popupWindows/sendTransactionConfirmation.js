/**
Template Controllers

@module Templates
*/

/**
The sendTransaction confirmation popup window template

@class [template] popupWindows_sendTransactionConfirmation
@constructor
*/

Template['popupWindows_sendTransactionConfirmation'].onCreated(function(){
    var template = this;

    this.autorun(function(c){

        var data = Session.get('data');

        if(data) {
            // set provided gas to templateVar
            TemplateVar.set('gas', data.gas || 0);

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
            web3.eth.getCode(data.to, function(e, res){
                if(!e && res.length > 2 && data.data.length > 2) {
                    TemplateVar.set(template, 'isContract', true);
                }
            });

            // esitmate gas usage
            web3.eth.estimateGas(data, function(e, res){
                if(!e && res) {
                    TemplateVar.set(template, 'estimatedGas', res);
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
    Calculates the fee used for this transaction in ether

    @method (estimatedFee)
    */
    'estimatedFee': function() {
        var gas =  TemplateVar.get('estimatedGas');
        if(gas && this.gasPrice)
            return EthTools.formatBalance(new BigNumber(gas, 10).times(new BigNumber(this.gasPrice, 10)), '0,0.0[0000000] unit', 'ether');
    }
});

Template['popupWindows_sendTransactionConfirmation'].events({
    /**
    Cancel the transaction confirmation and close the popup

    @event click .cancel
    */
    'click .cancel': function(){
        ipc.send('uiAction_unlockedAccount', 'Transaction not confirmed');
        ipc.send('uiAction_closePopupWindow');
    },
    /**
    Confirm the transaction

    @event submit form
    */
   'submit form': function(e, template){
        e.preventDefault();
        
        var pw = template.find('input[type="password"]').value,
            gas = web3.fromDecimal(TemplateVar.get('gas'));

        console.log('Choosen Gas: ', gas);

        if(!gas || !_.isFinite(gas))
            return;

        TemplateVar.set('unlocking', true);
        web3.personal.unlockAccount(Session.get('data').from, pw, 2, function(e, res){
            pw = null;
            TemplateVar.set(template, 'unlocking', false);

            console.warn(e);

            if(!e) {
                ipc.send('uiAction_unlockedAccount', null, gas);
                ipc.send('uiAction_closePopupWindow');

            } else {
                Tracker.afterFlush(function(){
                    template.find('input[type="password"]').value = '';
                    template.$('input[type="password"]').focus();
                });

                GlobalNotification.warning({
                    content: TAPi18n.__('mist.popupWindows.sendTransactionConfirmation.errors.wrongPassword'),
                    duration: 3
                });
            }

        });

   } 
});
