/**
Opens windows and popups

@module openExternal
*/

const { shell } = require('electron');

// open a[target="_blank"] in external browser
document.addEventListener(
  'click',
  e => {
    let node = false;

    if (e.target.nodeName === 'A') {
      node = e.target;
    } else if (e.target.parentNode && e.target.parentNode.nodeName === 'A') {
      node = e.target.parentNode;
    }

    // open in browser
    if (
      node &&
      node.attributes.target &&
      node.attributes.target.value === '_blank'
    ) {
      e.preventDefault();
      shell.openExternal(node.href);
    }
  },
  false
);
