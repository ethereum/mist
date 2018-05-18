import React, { Component } from 'react';
import Blockies from './Blockies';

class Identicon extends Component {
  render() {
    const { identity, link } = this.props;

    if (!identity) {
      return null;
    }

    if (link) {
      return (
        <a
          href={link}
          class="dapp-identicon {{class}}"
          style="background-image: url('{{identiconData identity}}')"
        >
          <img src="{{identiconDataPixel identity}}" class="identicon-pixel" />
        </a>
      );
    }

    // <span
    // className="dapp-identicon {{class}}"
    // style="background-image: url('{{identiconData identity}}')"
    // >
    // <Blockies opts={{ seed: identity }} />
    // </span>
    return <Blockies opts={{ seed: identity }} size="large" />;
  }
  // <img src="{{identiconDataPixel identity}}" class="identicon-pixel" />
}

export default Identicon;
