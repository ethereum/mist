import React, { Component } from 'react';
import blockies from 'ethereum-blockies';
// import { i18n } from '../API';
import hqxConstructor from '../utils/hqx';

let mod = {
  Math: Math
};
hqxConstructor(mod);
const { hqx } = mod;

// copied from https://github.com/ethereum/blockies/blob/master/react-component.js
// see also https://github.com/alexvandesande/meteor-identicon/blob/master/lib/identicon.js
// https://github.com/ethereum/meteor-package-elements/blob/master/identicon.html
export default class DappIdenticon extends Component {
  constructor(props) {
    super(props);
  }

  identiconData(identity) {
    return hqx(
      hqx(
        blockies.create({
          seed: identity,
          size: 8,
          scale: 1
        }),
        4
      ),
      4
    ).toDataURL();
  }

  identiconDataPixel(identity) {
    return blockies
      .create({
        seed: identity,
        size: 8,
        scale: 8
      })
      .toDataURL();
  }

  render() {
    const { identity } = this.props;

    if (!identity) {
      return null;
    }

    // dapp class sizes: large, medium, small, tiny
    return (
      <span
        className={`dapp-identicon dapp-${this.props.size}`}
        title={i18n.t('elements.identiconHelper')}
        style={{
          backgroundImage: `url('${this.identiconData(
            identity.toLowerCase()
          )}')`
        }}
      >
        <img
          src={this.identiconDataPixel(identity.toLowerCase())}
          className="identicon-pixel"
        />
      </span>
    );
  }
}
