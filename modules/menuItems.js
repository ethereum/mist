const {
  app,
  BrowserWindow,
  ipcMain: ipc,
  Menu,
  shell,
  dialog
} = require('electron');
const fs = require('fs');
const path = require('path');
const Windows = require('./windows');
const Settings = require('./settings');
const log = require('./utils/logger').create('menuItems');
const swarmLog = require('./utils/logger').create('swarm');
const updateChecker = require('./updateChecker');
const ethereumNode = require('./ethereumNode.js');
const ClientBinaryManager = require('./clientBinaryManager');

import {
  setLanguage,
  toggleSwarm,
  toggleSwarmOnStart
} from './core/settings/actions';
import { changeNetwork, changeSyncMode } from './core/nodes/actions';
import { SwarmState } from './core/settings/reducer';
import swarmNode from './swarmNode.js';

// Make easier to return values for specific systems
const switchForSystem = function(options) {
  if (process.platform in options) {
    return options[process.platform];
  } else if ('default' in options) {
    return options.default;
  }
  return null;
};

// create menu
// null -> null
const createMenu = function(webviews) {
  webviews = webviews || [];

  const menu = Menu.buildFromTemplate(menuTempl(webviews));
  Menu.setApplicationMenu(menu);
};

const restartNode = function(newType, newNetwork, syncMode, webviews) {
  newNetwork = newNetwork || ethereumNode.network;

  log.info('Switch node', newType, newNetwork);

  store.dispatch(changeNetwork(newNetwork));

  return ethereumNode
    .restart(newType, newNetwork, syncMode)
    .then(() => {
      Windows.getByType('main').load(global.interfaceAppUrl);
      createMenu(webviews);
      log.info('Node switch successful.');
    })
    .catch(err => {
      log.error('Error switching node', err);
    });
};

const changeNodeNetwork = function(network, webviews) {
  store.dispatch(changeNetwork(network));

  Settings.saveUserData('network', network);

  restartNode(ethereumNode.type, network, ethereumNode.syncMode, webviews);

  createMenu(webviews);
};

const changeNodeSyncMode = function(syncMode, webviews) {
  store.dispatch(changeSyncMode(syncMode));

  Settings.saveUserData('syncmode', syncMode);

  restartNode(ethereumNode.type, ethereumNode.network, syncMode, webviews);

  createMenu(webviews);
};

const startMining = webviews => {
  ethereumNode
    .send('miner_start', [1])
    .then(ret => {
      log.info('miner_start', ret.result);

      if (ret.result) {
        global.mining = true;
        createMenu(webviews);
      }
    })
    .catch(err => {
      log.error('miner_start', err);
    });
};

const stopMining = webviews => {
  ethereumNode
    .send('miner_stop', [1])
    .then(ret => {
      log.info('miner_stop', ret.result);

      if (ret.result) {
        global.mining = false;
        createMenu(webviews);
      }
    })
    .catch(err => {
      log.error('miner_stop', err);
    });
};

// create a menu template
// null -> obj
let menuTempl = function(webviews) {
  const menu = [];
  webviews = webviews || [];

  // APP
  const fileMenu = [];

  if (process.platform === 'darwin') {
    fileMenu.push(
      {
        label: i18n.t('mist.applicationMenu.app.about', {
          app: Settings.appName
        }),
        click() {
          Windows.createPopup('about');
        }
      },
      {
        label: i18n.t('mist.applicationMenu.app.checkForUpdates'),
        click() {
          updateChecker.runVisibly();
        }
      },
      {
        label: i18n.t('mist.applicationMenu.app.checkForNodeUpdates'),
        click() {
          // remove skipVersion
          fs.writeFileSync(
            path.join(Settings.userDataPath, 'skippedNodeVersion.json'),
            '' // write no version
          );

          // true = will restart after updating and user consent
          ClientBinaryManager.init(true);
        }
      },
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.app.services', {
          app: Settings.appName
        }),
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.app.hide', {
          app: Settings.appName
        }),
        accelerator: 'Command+H',
        role: 'hide'
      },
      {
        label: i18n.t('mist.applicationMenu.app.hideOthers', {
          app: Settings.appName
        }),
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
      },
      {
        label: i18n.t('mist.applicationMenu.app.showAll', {
          app: Settings.appName
        }),
        role: 'unhide'
      },
      {
        type: 'separator'
      }
    );
  }

  fileMenu.push({
    label: i18n.t('mist.applicationMenu.app.quit', {
      app: Settings.appName
    }),
    accelerator: 'CommandOrControl+Q',
    click() {
      app.quit();
    }
  });

  menu.push({
    label: i18n.t('mist.applicationMenu.app.label', {
      app: Settings.appName
    }),
    submenu: fileMenu
  });

  let swarmUpload = [];
  if (global.mode !== 'wallet') {
    swarmUpload.push(
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.file.swarmUpload'),
        accelerator: 'Shift+CommandOrControl+U',
        enabled: store.getState().settings.swarmState == SwarmState.Enabled,
        click() {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          const paths = dialog.showOpenDialog(focusedWindow, {
            properties: ['openFile', 'openDirectory']
          });
          if (paths && paths.length === 1) {
            const isDir = fs.lstatSync(paths[0]).isDirectory();
            const defaultPath = path.join(paths[0], 'index.html');
            const uploadConfig = {
              path: paths[0],
              kind: isDir ? 'directory' : 'file',
              defaultFile: fs.existsSync(defaultPath) ? '/index.html' : null
            };
            swarmNode
              .upload(uploadConfig)
              .then(hash => {
                focusedWindow.webContents.executeJavaScript(`
                          Tabs.update('browser', {$set: {
                              url: 'bzz://${hash}',
                              redirect: 'bzz://${hash}'
                          }});
                          LocalStore.set('selectedTab', 'browser');
                          `);
                swarmLog.info('Hash uploaded:', hash);
              })
              .catch(e => swarmLog.error(e));
          }
        }
      }
    );
  }

  menu.push({
    label: i18n.t('mist.applicationMenu.file.label'),
    submenu: [
      {
        label: i18n.t('mist.applicationMenu.file.newAccount'),
        accelerator: 'CommandOrControl+N',
        click() {
          Windows.createPopup('requestAccount');
        }
      },
      {
        label: i18n.t('mist.applicationMenu.file.importPresale'),
        accelerator: 'CommandOrControl+I',
        enabled: ethereumNode.isMainNetwork,
        click() {
          Windows.createPopup('importAccount');
        }
      },
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.file.backup'),
        submenu: [
          {
            label: i18n.t('mist.applicationMenu.file.backupKeyStore'),
            click() {
              let userPath = Settings.userHomePath;

              // eth
              if (ethereumNode.isEth) {
                if (process.platform === 'win32') {
                  userPath = `${Settings.appDataPath}\\Web3\\keys`;
                } else {
                  userPath += '/.web3/keys';
                }

                // geth
              } else {
                if (process.platform === 'darwin') {
                  userPath += '/Library/Ethereum/keystore';
                }

                if (
                  process.platform === 'freebsd' ||
                  process.platform === 'linux' ||
                  process.platform === 'sunos'
                ) {
                  userPath += '/.ethereum/keystore';
                }

                if (process.platform === 'win32') {
                  userPath = `${Settings.appDataPath}\\Ethereum\\keystore`;
                }
              }

              shell.showItemInFolder(userPath);
            }
          },
          {
            label: i18n.t('mist.applicationMenu.file.backupMist'),
            click() {
              shell.openItem(Settings.userDataPath);
            }
          }
        ]
      },
      ...swarmUpload
    ]
  });

  // EDIT
  menu.push({
    label: i18n.t('mist.applicationMenu.edit.label'),
    submenu: [
      {
        label: i18n.t('mist.applicationMenu.edit.undo'),
        accelerator: 'CommandOrControl+Z',
        role: 'undo'
      },
      {
        label: i18n.t('mist.applicationMenu.edit.redo'),
        accelerator: 'Shift+CommandOrControl+Z',
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.edit.cut'),
        accelerator: 'CommandOrControl+X',
        role: 'cut'
      },
      {
        label: i18n.t('mist.applicationMenu.edit.copy'),
        accelerator: 'CommandOrControl+C',
        role: 'copy'
      },
      {
        label: i18n.t('mist.applicationMenu.edit.paste'),
        accelerator: 'CommandOrControl+V',
        role: 'paste'
      },
      {
        label: i18n.t('mist.applicationMenu.edit.selectAll'),
        accelerator: 'CommandOrControl+A',
        role: 'selectall'
      }
    ]
  });

  // LANGUAGE (VIEW)
  const switchLang = langCode => (menuItem, browserWindow) => {
    store.dispatch(setLanguage(langCode, browserWindow));
  };

  const currentLanguage = Settings.language;
  const languageMenu = Object.keys(i18n.options.resources)
    .filter(langCode => langCode !== 'dev')
    .map(langCode => {
      const menuItem = {
        label: i18n.t(`mist.applicationMenu.view.langCodes.${langCode}`),
        type: 'checkbox',
        checked: langCode === currentLanguage,
        click: switchLang(langCode)
      };
      return menuItem;
    });

  languageMenu.unshift(
    {
      label: i18n.t('mist.applicationMenu.view.default'),
      click: switchLang(i18n.getBestMatchedLangCode(app.getLocale()))
    },
    {
      type: 'separator'
    }
  );

  // VIEW
  menu.push({
    label: i18n.t('mist.applicationMenu.view.label'),
    submenu: [
      {
        label: i18n.t('mist.applicationMenu.view.txHistory'),
        accelerator: 'CommandOrControl+Shift+H',
        click() {
          Windows.createPopup('txHistory');
        }
      },
      {
        label: i18n.t('mist.applicationMenu.view.fullscreen'),
        accelerator: switchForSystem({
          darwin: 'Command+Control+F',
          default: 'F11'
        }),
        click() {
          const mainWindow = Windows.getByType('main');

          mainWindow.window.setFullScreen(!mainWindow.window.isFullScreen());
        }
      },
      {
        label: i18n.t('mist.applicationMenu.view.languages'),
        submenu: languageMenu
      }
    ]
  });

  // DEVELOP
  const devToolsMenu = [];
  let devtToolsSubMenu;
  let curWindow;

  // change for wallet
  if (Settings.uiMode === 'mist') {
    devtToolsSubMenu = [
      {
        label: i18n.t('mist.applicationMenu.develop.devToolsMistUI'),
        accelerator: 'Alt+CommandOrControl+I',
        click() {
          curWindow = BrowserWindow.getFocusedWindow();
          if (curWindow) {
            curWindow.toggleDevTools();
          }
        }
      },
      {
        type: 'separator'
      }
    ];

    // add webviews
    webviews.forEach(webview => {
      devtToolsSubMenu.push({
        label: i18n.t('mist.applicationMenu.develop.devToolsWebview', {
          webview: webview.name
        }),
        click() {
          Windows.getByType('main').send(
            'uiAction_toggleWebviewDevTool',
            webview._id
          );
        }
      });
    });

    // wallet
  } else {
    devtToolsSubMenu = [
      {
        label: i18n.t('mist.applicationMenu.develop.devToolsWalletUI'),
        accelerator: 'Alt+CommandOrControl+I',
        click() {
          curWindow = BrowserWindow.getFocusedWindow();
          if (curWindow) {
            curWindow.toggleDevTools();
          }
        }
      }
    ];
  }

  devToolsMenu.push({
    label: i18n.t('mist.applicationMenu.develop.devTools'),
    submenu: devtToolsSubMenu
  });

  if (Settings.uiMode === 'mist') {
    devToolsMenu.push({
      label: i18n.t('mist.applicationMenu.develop.openRemix'),
      enabled: true,
      click() {
        Windows.createPopup('remix');
      }
    });
  }

  devToolsMenu.push({
    label: i18n.t('mist.applicationMenu.develop.runTests'),
    enabled: Settings.uiMode === 'mist',
    click() {
      Windows.getByType('main').send('uiAction_runTests', 'webview');
    }
  });

  devToolsMenu.push({
    label: i18n.t('mist.applicationMenu.develop.logFiles'),
    click() {
      try {
        const shown = shell.showItemInFolder(
          path.join(Settings.userDataPath, 'logs', 'all.log')
        );
        if (!shown) {
          shell.showItemInFolder(
            path.join(Settings.userDataPath, 'logs', 'all.log.0')
          );
        }
      } catch (error) {
        log.error(error);
      }
    }
  });

  // add node switching menu
  devToolsMenu.push({
    type: 'separator'
  });

  // add node switch
  if (process.platform === 'darwin' || process.platform === 'win32') {
    const nodeSubmenu = [];

    const ethClient = ClientBinaryManager.getClient('eth');
    const gethClient = ClientBinaryManager.getClient('geth');

    if (gethClient) {
      nodeSubmenu.push({
        label: `Geth ${gethClient.version}`,
        checked: ethereumNode.isOwnNode && ethereumNode.isGeth,
        enabled: ethereumNode.isOwnNode,
        type: 'checkbox',
        click() {
          restartNode('geth', null, 'fast', webviews);
        }
      });
    }

    if (ethClient) {
      nodeSubmenu.push({
        label: `Eth ${ethClient.version} (C++)`,
        checked: ethereumNode.isOwnNode && ethereumNode.isEth,
        enabled: ethereumNode.isOwnNode,
        // enabled: false,
        type: 'checkbox',
        click() {
          restartNode('eth');
        }
      });
    }

    devToolsMenu.push({
      label: i18n.t('mist.applicationMenu.develop.ethereumNode'),
      submenu: nodeSubmenu
    });
  }

  // add network switch
  devToolsMenu.push({
    label: i18n.t('mist.applicationMenu.develop.network'),
    submenu: [
      {
        label: i18n.t('mist.applicationMenu.develop.mainNetwork'),
        accelerator: 'CommandOrControl+Alt+1',
        checked: store.getState().nodes.network === 'main',
        enabled: store.getState().nodes.network !== 'private',
        type: 'checkbox',
        click() {
          changeNodeNetwork('main', webviews);
        }
      },
      {
        label: 'Ropsten - Test network',
        accelerator: 'CommandOrControl+Alt+2',
        checked: store.getState().nodes.network === 'ropsten',
        enabled: store.getState().nodes.network !== 'private',
        type: 'checkbox',
        click() {
          changeNodeNetwork('ropsten', webviews);
        }
      },
      {
        label: 'Rinkeby - Test network',
        accelerator: 'CommandOrControl+Alt+3',
        checked: store.getState().nodes.network === 'rinkeby',
        enabled: store.getState().nodes.network !== 'private',
        type: 'checkbox',
        click() {
          changeNodeNetwork('rinkeby', webviews);
        }
      }
      // {
      //   label: 'Solo network',
      //   accelerator: 'CommandOrControl+Alt+4',
      //   checked: ethereumNode.isOwnNode && ethereumNode.isDevNetwork,
      //   enabled: ethereumNode.isOwnNode,
      //   type: 'checkbox',
      //   click() {
      //     restartNode(ethereumNode.type, 'dev');
      //   }
      // }
    ]
  });

  // add sync mode switch
  devToolsMenu.push({
    label: i18n.t('mist.applicationMenu.develop.syncMode'),
    submenu: [
      {
        label: i18n.t('mist.applicationMenu.develop.syncModeLight'),
        enabled: ethereumNode.isOwnNode && !ethereumNode.isDevNetwork,
        checked: store.getState().nodes.local.syncMode === 'light',
        type: 'checkbox',
        click() {
          changeNodeSyncMode('light', webviews);
        }
      },
      {
        label: i18n.t('mist.applicationMenu.develop.syncModeFast'),
        enabled: ethereumNode.isOwnNode && !ethereumNode.isDevNetwork,
        checked: store.getState().nodes.local.syncMode === 'fast',
        type: 'checkbox',
        click() {
          changeNodeSyncMode('fast', webviews);
        }
      },
      {
        label: i18n.t('mist.applicationMenu.develop.syncModeFull'),
        enabled: ethereumNode.isOwnNode,
        checked: store.getState().nodes.local.syncMode === 'full',
        type: 'checkbox',
        click() {
          changeNodeSyncMode('full', webviews);
        }
      },
      {
        label: i18n.t('mist.applicationMenu.develop.syncModeNoSync'),
        enabled: ethereumNode.isOwnNode && !ethereumNode.isDevNetwork,
        checked: store.getState().nodes.local.syncMode === 'nosync',
        type: 'checkbox',
        click() {
          changeNodeSyncMode('nosync', webviews);
        }
      }
    ]
  });

  // Enables mining menu: only in Solo mode and Ropsten network (testnet)
  if (
    ethereumNode.isOwnNode &&
    (ethereumNode.isTestNetwork || ethereumNode.isDevNetwork)
  ) {
    devToolsMenu.push(
      {
        type: 'separator'
      },
      {
        label: global.mining
          ? i18n.t('mist.applicationMenu.develop.stopMining')
          : i18n.t('mist.applicationMenu.develop.startMining'),
        accelerator: 'CommandOrControl+Shift+M',
        enabled: true,
        click() {
          if (global.mining) {
            stopMining(webviews);
          } else {
            startMining(webviews);
          }
        }
      }
    );
  }

  if (global.mode !== 'wallet') {
    devToolsMenu.push(
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.develop.enableSwarm'),
        enabled: true,
        checked: [SwarmState.Enabling, SwarmState.Enabled].includes(
          global.store.getState().settings.swarmState
        ),
        type: 'checkbox',
        click() {
          store.dispatch(toggleSwarm());
        }
      }
    );
  }

  menu.push({
    label:
      (global.mining ? '⛏ ' : '') +
      i18n.t('mist.applicationMenu.develop.label'),
    submenu: devToolsMenu
  });

  // WINDOW
  menu.push({
    label: i18n.t('mist.applicationMenu.window.label'),
    role: 'window',
    submenu: [
      {
        label: i18n.t('mist.applicationMenu.window.minimize'),
        accelerator: 'CommandOrControl+M',
        role: 'minimize'
      },
      {
        label: i18n.t('mist.applicationMenu.window.close'),
        accelerator: 'CommandOrControl+W',
        role: 'close'
      },
      {
        type: 'separator'
      },
      {
        label: i18n.t('mist.applicationMenu.window.toFront'),
        role: 'front'
      }
    ]
  });

  // HELP
  const helpMenu = [];

  if (
    process.platform === 'freebsd' ||
    process.platform === 'linux' ||
    process.platform === 'sunos' ||
    process.platform === 'win32'
  ) {
    helpMenu.push(
      {
        label: i18n.t('mist.applicationMenu.app.about', {
          app: Settings.appName
        }),
        click() {
          Windows.createPopup('about');
        }
      },
      {
        label: i18n.t('mist.applicationMenu.app.checkForUpdates'),
        click() {
          updateChecker.runVisibly();
        }
      }
    );
  }
  helpMenu.push(
    {
      label: i18n.t('mist.applicationMenu.help.mistWiki'),
      click() {
        shell.openExternal('https://github.com/ethereum/mist/wiki');
      }
    },
    {
      label: i18n.t('mist.applicationMenu.help.gitter'),
      click() {
        shell.openExternal('https://gitter.im/ethereum/mist');
      }
    },
    {
      label: i18n.t('mist.applicationMenu.help.reportBug'),
      click() {
        shell.openExternal('https://github.com/ethereum/mist/issues');
      }
    }
  );

  menu.push({
    label: i18n.t('mist.applicationMenu.help.label'),
    role: 'help',
    submenu: helpMenu
  });
  return menu;
};

module.exports = createMenu;
