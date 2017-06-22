/**
Spices up type="eth-address"

@module ui-elements
*/

module.export = (function() {
  var inputTypeEthAddress = function() {
    console.log('ui-elements started...');
    var validAddress = function(value) {
      return /^0x[0-9a-f]{40}$/gi.test(value);
    };
    var validAddressWithoutPrefix = function(value) {
      return /^[0-9a-f]{40}$/gi.test(value);
    };
    var validName = function(value) {
      return /^(.+)\.eth$/g.test(value);
    };

    var fetchENSEntry = function(element) {
      setAddress(element, '0x0000000000000000000000000000000000000000');
    };

    var setAddress = function(element, address) {
      element.dataset.address = address;
    };
    var removeAddress = function(element) {
      delete element.dataset.address;
    };
    var setInvalid = function(element) {
      element.classList.add('is-invalid');
      element.setCustomValidity('Invalid address');
    };
    var setValid = function(element) {
      element.classList.remove('is-invalid');
      element.setCustomValidity('');
    };

    const inputs = document.querySelectorAll('input[type=eth-address], input[data-type=eth-address]');

    inputs.forEach(function(input) {
        input.addEventListener('input', function(inputEvent) {

          var element = inputEvent.target;
          console.log('input detected', inputEvent, element, element.value);

          if (validName(element.value)) {
            console.log('valid name found');
            setValid(element);
            fetchENSEntry(element);
          }
          else if (validAddress(element.value)) {
            console.log('valid address found');
            setAddress(element, element.value);
            setValid(element);
          }
          else {
            removeAddress(element);
            setInvalid(element);
          }

        }, false);

    });
  }

  render = function() {

  }

  state = {
    value: ''
  }

  input.addEventListener('input', function(inputEvent) {
    render();
  })



  document.addEventListener('DOMContentLoaded', inputTypeEthAddress, false);
}());
