import React, { Component } from 'react';
import blockies from 'ethereum-blockies';
import hqx from '../utils/hqx';

class Blockies extends Component {
  getOpts() {
    console.log('∆∆∆ this.props.opts', this.props.opts);
    return {
      seed: this.props.opts.seed || 'foo',
      color: this.props.opts.color || '#dfe',
      bgcolor: this.props.opts.bgcolor || '#a71',
      size: this.props.opts.size || 8,
      scale: this.props.opts.scale || 1,
      spotcolor: this.props.opts.spotcolor || '#000'
    };
  }

  render() {
    const identity = this.props.opts.seed.toLowerCase();

    const original = blockies.create(
      Object.assign({}, this.getOpts(), { scale: 8 })
    );

    const fuzzySource = blockies.create(this.getOpts());
    const fuzzyIdenticon = hqx(hqx(fuzzySource, 4), 4);

    // this.props.size: tiny, small, medium, large

    return (
      <span
        className={`dapp-identicon dapp-${this.props.size}`}
        style={{ backgroundImage: `url(${fuzzyIdenticon.toDataURL()})` }}
      >
        <img src={original.toDataURL()} className="identicon-pixel" />
      </span>
    );
  }
}

export default Blockies;
