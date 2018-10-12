import React, { Component } from 'react';
import moment from 'moment';
import PieChart from 'react-minimal-pie-chart';

class StatusLight extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pulseColorClass: ''
    };
  }

  componentDidUpdate(prevProps) {
    // if new block arrived, add animation to light
    if (this.isNewBlock(prevProps, this.props)) {
      const pulseColorClass =
        prevProps.active === 'remote'
          ? 'pulse-light__orange'
          : this.props.network === 'main'
            ? 'pulse-light__green'
            : 'pulse-light__blue';

      this.setState({ pulseColorClass }, () => {
        setTimeout(() => {
          this.setState({ pulseColorClass: '' });
        }, 2000);
      });
    }
  }

  isNewBlock(prevProps, newProps) {
    if (prevProps.active === 'remote') {
      return prevProps.remote.blockNumber !== newProps.remote.blockNumber;
    } else {
      return prevProps.local.blockNumber !== newProps.local.blockNumber;
    }
  }

  secondsSinceLastBlock() {
    const { active } = this.props;
    const lastBlock = moment(this.props[active].timestamp, 'X');
    return moment().diff(lastBlock, 'seconds');
  }

  render() {
    const { active, network, local, remote } = this.props;

    let dotColor = network == 'main' ? '#7ed321' : '#00aafa';

    const { highestBlock, currentBlock, startingBlock } = local.sync;
    const progress =
      ((currentBlock - startingBlock) / (highestBlock - startingBlock)) * 100;

    return (
      <div className="pie-container">
        <div
          id="node-info__light"
          className={this.state.pulseColorClass}
          style={{
            backgroundColor:
              this.secondsSinceLastBlock() > 60
                ? 'red'
                : active === 'remote'
                  ? 'orange'
                  : dotColor
          }}
        />
        {active === 'remote' &&
          currentBlock !== 0 && (
            <PieChart
              startAngle={-90}
              style={{
                position: 'absolute',
                top: 22,
                left: 0,
                zIndex: 2,
                height: 16
              }}
              data={[
                { value: progress || 0, key: 1, color: dotColor },
                { value: 100 - (progress || 1), key: 2, color: 'orange' }
              ]}
            />
          )}
      </div>
    );
  }
}

export default StatusLight;
