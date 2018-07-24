exports.determineIfContract = function determineIfContract(toAddress) {
  return function(dispatch) {
    dispatch({ type: '[CLIENT]:DETERMINE_IF_CONTRACT:START' });

    if (!toAddress) {
      return dispatch({
        type: '[CLIENT]:DETERMINE_IF_CONTRACT:SUCCESS',
        payload: { toIsContract: true, isNewContract: true }
      });
    }

    web3.eth.getCode(this.props.newTransaction.to, async (e, res) => {
      console.log('∆∆∆ getCode e', e);
      console.log('∆∆∆ getCode res', res);
      if (!e && res && res.length > 2) {
        return dispatch({
          type: '[CLIENT]:DETERMINE_IF_CONTRACT:SUCCESS',
          payload: { toIsContract: true, isNewContract: false }
        });
        // setWindowSize(template);
      }
    });
  };
};
