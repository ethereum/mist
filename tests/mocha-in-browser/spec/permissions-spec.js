// implement chai's should interface
var expect = chai.expect;

describe('Permissions', function() {
  describe('permissions', function() {
    it('should be available', function() {
      expect(window.permissions).to.be.an(
        'object',
        'The permissions object was not present, please reload the test page'
      );
      expect(window.permissions.accounts).to.be.an(
        'array',
        'The permissions object was not present, please reload the test page'
      );
    });
  });

  describe('web3.eth.accounts', function() {
    it('should return an array [sync]', function() {
      var accounts = web3.eth.accounts;
      expect(accounts).to.be.an('array');
    });

    it('should return an array [async]', function(done) {
      web3.eth.getAccounts(function(e, accounts) {
        expect(e).to.be.null;
        expect(accounts).to.be.an('array');

        done();
      });
    });

    it("should match the allowed accounts in the tabs permisssions, and don't contain coinbase [sync]", function(done) {
      var accounts = web3.eth.accounts;

      expect(window.permissions.accounts.length).to.equal(accounts.length);
      expect(window.permissions.accounts).to.not.include(window.coinbase);
      accounts.forEach(function(account) {
        expect(window.permissions.accounts).to.include(account);
      });

      done();
    });

    it("should match the allowed accounts in the tabs permisssions, and don't contain coinbase [async]", function(done) {
      web3.eth.getAccounts(function(e, accounts) {
        expect(window.permissions.accounts.length).to.equal(accounts.length);
        expect(window.permissions.accounts).to.not.include(window.coinbase);
        accounts.forEach(function(account) {
          expect(window.permissions.accounts).to.include(account);
        });

        done();
      });
    });

    it("should match the allowed accounts in the tabs permisssions, and don't contain coinbase [async, batch request]", function(done) {
      var count = 1;

      var callback = function(e, accounts) {
        expect(window.permissions.accounts.length).to.equal(accounts.length);
        expect(window.permissions.accounts).to.not.include(window.coinbase);
        accounts.forEach(function(account) {
          expect(window.permissions.accounts).to.include(account);
        });

        if (count === 2) {
          done();
        }

        count += count;
      };

      var batch = web3.createBatch();
      batch.add(web3.eth.getAccounts.request(callback));
      batch.add(web3.eth.getAccounts.request(callback));
      batch.execute();
    });
  });

  describe('web3.eth.coinbase', function() {
    it('should be empty [sync]', function() {
      var coinbase = web3.eth.coinbase;
      expect(coinbase).to.be.null;
    });

    it('should be empty [async]', function(done) {
      web3.eth.getCoinbase(function(e, coinbase) {
        expect(e).to.be.null;
        expect(coinbase).to.be.null;

        done();
      });
    });

    it('should be empty [async, batch request]', function(done) {
      var count = 1;

      var callback = function(e, coinbase) {
        expect(e).to.be.null;
        expect(coinbase).to.be.null;

        if (count === 2) {
          done();
        }

        count += count;
      };

      var batch = web3.createBatch();
      batch.add(web3.eth.getCoinbase.request(callback));
      batch.add(web3.eth.getCoinbase.request(callback));
      batch.execute();
    });
  });

  describe('web3 parameter validation', function() {
    it("shouldn't allow RegExp (possible XSS)", function() {
      var add = '0x0000000000000000000000000000000000000000';
      expect(function() {
        web3.eth.sendTransaction({
          from: add,
          to: add,
          data: new RegExp('')
        });
      }).to.throw(
        "Payload, or some of its content properties are invalid. Please check if they are valid HEX with '0x' prefix."
      );
    });
  });

  describe('web3 attributes', function() {
    it("shouldn't allow IPC provider", function() {
      expect(window.ipc).to.be.undefined;
      expect(window.ipcRenderer).to.be.undefined;
    });

    it('should only contain allowed attributes', function() {
      var allowedAttributes = [
        '_requestManager',
        'bzz',
        'currentProvider',
        'eth',
        'db',
        'shh',
        'net',
        'personal',
        'settings',
        'version',
        'providers',
        '_extend'
      ];

      expect(web3).to.have.all.keys(allowedAttributes);
    });
  });
});
