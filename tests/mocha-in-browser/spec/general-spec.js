// implement chai's should interface
var expect = chai.expect;

describe('General', function () {

    describe('window.prompt()', function () {
        it('should not throw errors', function () {
            expect(window.prompt).to.not.throw(Error);
        });
    });

    describe('Mist', function () {
        it('shouldn\'t expose dirname', function () {
            expect(mist.dirname).to.be.undefined;
        });

        it('shouldn\'t expose shell', function () {
            expect(mist.shell).to.be.undefined;
        });

        it('should contain only allowed attributes', function (){
            var allowedAttributes = [
                'callbacks',
                'version',
                'license',
                'platform',
                'requestAccount',
                'sounds',
                'menu'
            ];

            expect(mist).to.have.all.keys(allowedAttributes);
        });
    });

    describe('Anonymous mode', function () {
        it('shouldn\'t show etherbase account', function () {
            expect(web3.coinbase).to.be.undefined;
        });
    });
});
