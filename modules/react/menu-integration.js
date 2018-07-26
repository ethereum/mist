import { app, dialog, BrowserWindow, Menu, MenuItem } from 'electron';

import updater from './updater';

function createReactSubMenu(version) {
  let popupMenu = (name, label) => {
    return new MenuItem({
      label: label || name,
      click: () => {
        // windowManager.showPopup(name)
      }
    });
  };

  const testPopupSubMenu = new Menu();
  testPopupSubMenu.append(popupMenu('ClientUpdateAvailable'));
  testPopupSubMenu.append(popupMenu('ConnectAccount'));
  testPopupSubMenu.append(popupMenu('SendTransactionConfirmation'));

  let reactSubMenu = new Menu();
  reactSubMenu.append(
    new MenuItem({
      label: 'Open UI',
      enabled: false
    })
  );
  reactSubMenu.append(
    new MenuItem({
      label: 'Check Update',
      click: async () => {
        let update = await updater.checkUpdate();
        if (!update) {
          dialog.showMessageBox({
            title: 'No update',
            message: 'You are using the latest version'
          });
          return;
        }
        dialog.showMessageBox(
          {
            title: 'Checking for updates',
            message: `
        React UI update found: v${update.version} 
        Press "OK" to download in background
        `
          },
          async () => {
            let download = await updater.downloadUpdate(update);
            if (!download.error) {
              dialog.showMessageBox({
                title: 'Update downloaded',
                message: `Press OK to reload for update to version ${
                  download.version
                }`
              });
              let asarPath = download.filePath;
              start(asarPath, download.version);
            } else {
              dialog.showMessageBox({
                title: 'Download failed',
                message: `Error ${download.error}`
              });
            }
          }
        );
      }
    })
  );
  reactSubMenu.append(
    new MenuItem({
      label: 'Reload -> update',
      enabled: false
    })
  );
  reactSubMenu.append(popupMenu('Rollback'));
  reactSubMenu.append(
    new MenuItem({
      label: 'Popups',
      submenu: testPopupSubMenu
    })
  );
  reactSubMenu.append(popupMenu('ReactUiSettings', 'Settings'));

  reactSubMenu.append(
    new MenuItem({
      label: `v${version}`
    })
  );

  return reactSubMenu;
}

function createReactMenu() {
  let reactSubMenu = createReactSubMenu('0.0.0');
  return new MenuItem({ label: 'React UI', submenu: reactSubMenu });
}

export default createReactMenu;
