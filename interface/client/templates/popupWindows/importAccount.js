/**
Template Controllers

@module Templates
*/

/**
The importAccount import template

@class [template] popupWindows_importAccount
@constructor
*/

Template['popupWindows_importAccount'].helpers({
  /**
    Show password

    @method showPassword
    */
  showPassword: function() {
    return TemplateVar.get('showPassword') ? 'text' : 'password';
  }
});

Template['popupWindows_importAccount'].events({
  /**
    On drag enter, change class

    @event dragenter .dropable
    */
  'dragenter .dropable': function(e) {
    $(e.currentTarget).addClass('active');
  },
  /**
    On drag leave, change class

    @event dragleave .dropable
    */
  'dragleave .dropable': function(e) {
    $(e.currentTarget).removeClass('active');
  },
  /**
    When the file is droped, read the path

    @event drop .dropable
    */
  'drop .dropable': function(e, template) {
    e.preventDefault();

    if (e.originalEvent.dataTransfer) {
      files = e.originalEvent.dataTransfer.files;
    }

    if (files.length) {
      ipc.send('backendAction_checkWalletFile', files[0].path);

      ipc.on('uiAction_checkedWalletFile', function(ev, error, type) {
        switch (type) {
          case 'presale':
            console.log(`Imported ${type} account`);
            TemplateVar.set(template, 'filePath', files[0].path);
            Tracker.afterFlush(function() {
              template.$('.password').focus();
            });
            break;
          case 'web3':
            console.log(`Imported ${type} account`);
            TemplateVar.set(template, 'filePath', files[0].path);
            TemplateVar.set(template, 'importing', true);
            setTimeout(function() {
              ipc.send('backendAction_closePopupWindow');
            }, 750);
            break;
          default:
            GlobalNotification.warning({
              content: TAPi18n.__(
                'mist.popupWindows.onboarding.errors.unknownFile'
              ),
              duration: 4
            });
        }
      });
    }

    $(e.currentTarget).removeClass('active');
  },
  /**
    On drag over prevent redirect

    @event dragover .dropable
    */
  'dragover .dropable': function(e) {
    e.preventDefault();
  },
  /**
    On show password

    @event click .show-password
    */
  'click .show-password': function(e) {
    TemplateVar.set('showPassword', e.currentTarget.checked);
  },
  /**
    Checks the password match sends the file path and password to the mist backend to import

    @event submit form
    */
  'submit form': function(e, template) {
    var pw = template.find('input.password').value;

    ipc.send('backendAction_importWalletFile', TemplateVar.get('filePath'), pw);

    TemplateVar.set('importing', true);
    ipc.on('uiAction_importedWalletFile', function(ev, error, address) {
      TemplateVar.set(template, 'importing', false);
      TemplateVar.set(template, 'filePath', false);

      if (address) {
        ipc.removeAllListeners('uiAction_importedWalletFile');
        console.log('Imported account: ', address);

        // move to add account screen, when in the onboarding window
        if ($('.onboarding-start')[0]) {
          TemplateVar.setTo(
            '.onboarding-account',
            'newAccount',
            web3.toChecksumAddress(address)
          );
          TemplateVar.setTo('.onboarding-screen', 'currentActive', 'account');

          // otherwise simply close the window
        } else {
          ipc.send('backendAction_closePopupWindow');
        }
      } else {
        console.log('Import failed', error);

        if (error === 'Decryption Failed') {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.onboarding.errors.wrongPassword'
            ),
            duration: 4
          });
        } else {
          GlobalNotification.warning({
            content: TAPi18n.__(
              'mist.popupWindows.onboarding.errors.importFailed',
              {
                error
              }
            ),
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
