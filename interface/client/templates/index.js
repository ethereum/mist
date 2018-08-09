/**
Template Controllers

@module Templates
*/

/**
The body template

@class [template] body
@constructor
*/

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import About from '../../components/About';
import RequestAccount from '../../components/RequestAccount';
import SendTx from '../../components/SendTx/';

const COMPONENTS = {
  About,
  RequestAccount,
  SendTx
};

function renderReactComponentPopup(component) {
  const Component = COMPONENTS[component];
  if (!!Component) {
    render(
      <Provider store={store}>
        <Component />
      </Provider>,
      document.getElementById('react-entry')
    );
  }
}

// NOTE: While in the process of converting the Meteor codebase to React,
// generic windows reuse electron windows by replacing either the
// component or the template
ipc.on('uiAction_switchTemplate', (e, templateName) => {
  const componentName =
    templateName.charAt(0).toUpperCase() + templateName.slice(1);

  // If a React component exists, render it
  if (!!COMPONENTS[componentName]) {
    TemplateVar.setTo(
      '#generic-body',
      'MainRenderTemplate',
      `popupWindows_generic`
    );
    renderReactComponentPopup(componentName);
  } else {
    // Otherwise, use the meteor template
    renderReactComponentPopup('');
    TemplateVar.setTo(
      '#generic-body',
      'MainRenderTemplate',
      `popupWindows_${templateName}`
    );
  }
});

Template.body.helpers({
  /**
    Chooses the view to render at start

    @method renderApp
    */
  renderApp: function() {
    // Generic windows return the TemplateVar if set in the ipc call above
    const template = TemplateVar.get('MainRenderTemplate');
    if (template) {
      return template;
    }

    if (_.isEmpty(location.hash)) {
      $('title').text('Mist');
      return 'layout_main';
    } else {
      const renderWindow = location.hash.match(/#([a-zA-Z]*)_?/);

      // TODO: handle React components
      const REACT_COMPONENTS = ['about', 'requestAccount', 'sendTx'];
      if (REACT_COMPONENTS.includes(renderWindow[1])) {
        return false;
      }

      if (renderWindow.length > 0) {
        return 'popupWindows_' + renderWindow[1];
      } else {
        return false;
      }
    }
  }
});

/*
Template.body.events({
    /**
    On drag over prevent redirect

    @event dragover body > *, drop body > *
    *
   'dragover body > *, drop body > *': function(e){
        e.preventDefault();
    },
});*/
