/**
Template Controllers

@module Templates
*/

/**
The onboardingScreen template

@class [template] popupWindows_onboardingScreen
@constructor
*/

/**
Check if its the testnet

@method isTestnet
*/
var isTestnet = function(template){
    // CHECK FOR NETWORK
    web3.eth.getBlock(0, function(e, res){
        if(!e){
            switch(res.hash) {
                case '0x0cd786a2425d16f152c658316c423e6ce1181e15c3295826d7c9904cba9ce303':
                    TemplateVar.set(template, 'testnet', true);
                    break;
                case '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3':
                    TemplateVar.set(template, 'testnet', false);
                    break;
                default:
                    TemplateVar.set(template, 'testnet', false);
            }
        }
    });
}

/**
Update the peercount

@method getPeerCount
*/
var getPeerCount = function(template) {
    web3.net.getPeerCount(function(e, res) {
        if(!e)
            TemplateVar.set(template, 'peerCount', res);
    });
};



Template['popupWindows_onboardingScreen'].onCreated(function(){
    var template = this;
    TemplateVar.set('readyToLaunch', false);


    // check for block status
    this.syncFilter = web3.eth.isSyncing(function(error, syncing) {
        if(!error) {

            if(syncing === true) {
                web3.reset(true);

            } else if(_.isObject(syncing)) {
                
                syncing.progress = Math.floor(((syncing.currentBlock - syncing.startingBlock) / (syncing.highestBlock - syncing.startingBlock)) * 100);
                syncing.blockDiff = numeral(syncing.highestBlock - syncing.currentBlock).format('0,0');

                TemplateVar.set(template, 'syncing', syncing);
                
            } else {
                TemplateVar.set(template, 'syncing', false);
            }
        }
    });


    // CHECK PEER COUNT
    this.peerCountIntervalId = null;

    TemplateVar.set('peerCount', 0);
    getPeerCount(template);

    Meteor.clearInterval(this.peerCountIntervalId);
    this.peerCountIntervalId = setInterval(function() {
        getPeerCount(template);
    }, 1000);


    TemplateVar.set('currentActive', 'start');

    // store the last class
    this.autorun(function(){
        TemplateVar.set('lastActive', TemplateVar.get('currentActive'));
    });
})

Template['popupWindows_onboardingScreen'].onRendered(function(){
    // check which net it is
    isTestnet(this);
})

Template['popupWindows_onboardingScreen'].helpers({
    'newAccountLowerCase': function(){
        var account = TemplateVar.get('newAccount');
        return (account) ? account.toLowerCase() : '';
    }
});

Template['popupWindows_onboardingScreen'].events({
   'click .goto-start': function(e){
        if(TemplateVar.get('testnet')) {
            ipc.send('onBoarding_changeNet', false);
            TemplateVar.set('testnet', false);
            // TODO: re-start syncing subscription
        }

        TemplateVar.set('currentActive','start');
    },
   'click .goto-import-account': function(){
        TemplateVar.set('currentActive','import-account');

        // if testnet, make sure to switch to the mainnet
        if(TemplateVar.get('testnet')) {
            ipc.send('onBoarding_changeNet', false);
            TemplateVar.set('testnet', false);
            // TODO: re-start syncing subscription
        }
    },
   'click .start-testnet': function(e, template){

        ipc.send('onBoarding_changeNet', true);
        TemplateVar.set('testnet', true);
        // TODO: re-start syncing subscription

        TemplateVar.set('currentActive','testnet');
        template.$('.onboarding-testnet input.password').focus();
    },
   'click .goto-password': function(e, template){
        TemplateVar.set('currentActive','password');
        template.$('.onboarding-password input.password').focus();
    },
   'click .goto-account': function(){
        TemplateVar.set('currentActive','account');
    },
   'click .goto-tutorial-1': function(){
        TemplateVar.set('currentActive','tutorial-1');
        TemplateVar.set('readyToLaunch', true);
    },
   'click .goto-tutorial-2': function(){
        TemplateVar.set('currentActive','tutorial-2');
        TemplateVar.set('readyToLaunch', true);
    },
   'click .goto-tutorial-3': function(){
        TemplateVar.set('currentActive','tutorial-3');
        TemplateVar.set('readyToLaunch', true);
    },
    /**
    Start the application

    @event click .launch-app
    */
    'click .launch-app': function(){
        ipc.send('onBoarding_launchApp');
    },
    /**
    On drag over prevent redirect

    @event dragover .onboarding-screen, drop .onboarding-screen
    */
   'dragover .onboarding-screen, drop .onboarding-screen': function(e){
        e.preventDefault();
    }
});


/**
The onboardingScreen account import template

@class [template] popupWindows_onboardingScreen_importAccount
@constructor
*/

Template['popupWindows_onboardingScreen_importAccount'].helpers({
    /**
    Show password

    @method showPassword
    */
    'showPassword': function() {
        return TemplateVar.get('showPassword')? 'text' : 'password' ;
    }
})


Template['popupWindows_onboardingScreen_importAccount'].events({
    /**
    On drag enter, change class

    @event dragenter .dropable
    */
   'dragenter .dropable': function(e){
        $(e.currentTarget).addClass('active');
    },
    /**
    On drag leave, change class

    @event dragleave .dropable
    */
   'dragleave .dropable': function(e){
        $(e.currentTarget).removeClass('active');
    },
    /**
    When the file is droped, read the path

    @event drop .dropable
    */
   'drop .dropable': function(e, template){
        e.preventDefault();

        if(e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files.length) {
            TemplateVar.set('filePath', e.originalEvent.dataTransfer.files[0].path);
            Tracker.afterFlush(function(){
                template.$('.password').focus();
            });
        } else {
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.onboarding.errors.unknownFile'),
                duration: 4
            });
        }

        $(e.currentTarget).removeClass('active');
    },
    /**
    On drag over prevent redirect

    @event dragover .dropable
    */
   'dragover .dropable': function(e){
        e.preventDefault();
    },
    /**
    On show password

    @event click #show-password
    */
   'click #show-password': function(e){
        TemplateVar.set('showPassword', e.currentTarget.checked)
    },
    /**
    Checks the password match sends the file path and password to the mist backend to import
    
    @event submit form
    */
    'submit form': function(e, template){
        var pw = template.find('input.password').value;


        ipc.send('backendAction_importPresaleFile', TemplateVar.get('filePath'), pw);

        TemplateVar.set('importing', true);
        ipc.on('uiAction_importedPresaleFile', function(e, error, address){
            TemplateVar.set(template, 'importing', false);
            TemplateVar.set(template, 'filePath', false);

            if(address) {
                ipc.removeAllListeners('uiAction_importedPresaleFile');
                console.log('Imported account: ', address);

                // move to add account screen, when in the onboarding window
                if($('.onboarding-start')[0]) {
                    TemplateVar.setTo('.onboarding-account', 'newAccount', web3.toChecksumAddress(address));
                    TemplateVar.setTo('.onboarding-screen', 'currentActive', 'account');
                
                // otherwise simply close the window
                } else {
                    ipc.send('backendAction_closePopupWindow');
                }


            } else {
                console.log('Import failed', error);

                if(error === 'Decryption Failed') {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.passwordError'),
                        duration: 4
                    });
                } else {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.importFailed', {error: error}),
                        duration: 4
                    });
                }
            }
        });

        // clear form
        template.find('input.password').value = '';
        pw = null;
    }
});



/**
The onboardingScreen password template

@class [template] popupWindows_onboardingScreen_password
@constructor
*/

Template['popupWindows_onboardingScreen_password'].onRendered(function(){
});


Template['popupWindows_onboardingScreen_password'].events({
    /**
    Clear the form
    
    @event click button[type="button"]
    */
   'click button[type="button"]': function(e, template){
        template.find('input.password').value = '';
        template.find('input.password-repeat').value = '';
    },
    /**
    Checks the password match and creates a new account
    
    @event submit form
    */
    'submit form': function(e, template){
        var pw = template.find('input.password').value,
            pwRepeat = template.find('input.password-repeat').value;

        if(!pw || pw !== pwRepeat) {
            GlobalNotification.warning({
                content: TAPi18n.__('mist.popupWindows.requestAccount.errors.passwordMismatch'),
                duration: 3
            });

        } else {
            TemplateVar.set('creatingPassword', true);
            web3.personal.newAccount(pw, function(e, res){
                TemplateVar.set(template, 'creatingPassword', false);

                if(!e) {
                    TemplateVar.setTo('.onboarding-account', 'newAccount', web3.toChecksumAddress(res));
                    TemplateVar.setTo('.onboarding-screen', 'currentActive', 'account');
                    
                    // clear form
                    pw = pwRepeat = null;

                } else {
                    GlobalNotification.warning({
                        content: TAPi18n.__('mist.popupWindows.onboarding.errors.nodeNotStartedYet'),
                        duration: 4
                    });
                }
            });
        }
    }
});