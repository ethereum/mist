// implement chai's should interface
var expect = chai.expect;

describe('Anonymous mode', function () {
    describe('web3.eth', function () {
        it('shouldn\'t allow etherbase account', function () {
            expect(web3.eth.coinbase).to.be.null;
        });

        it('shouldn\'t allow accounts', function () {
            expect(web3.eth.accounts).to.be.empty;
        });
    });

    describe('Permissions', function() {
        it('permissions object should be empty', function () {
            expect(permissions).to.be.empty;
        });
    });
});
