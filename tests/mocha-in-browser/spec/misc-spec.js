var expect = chai.expect;

describe('Misc', function () {
    describe('window.prompt()', function () {
        it('should not throw errors', function () {
            expect(window.prompt).to.not.throw(Error);
        });
    });
});

