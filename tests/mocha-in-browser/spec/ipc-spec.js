// implement chai's should interface
var expect = chai.expect;
var idCount = 500;

describe('IPC connection', function() {
  describe('ipcProvider', function() {
    it("shouldn't allow admin functionality [async]", function(done) {
      var id = idCount++;

      ipcProvider.connect();

      ipcProvider.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: id,
          method: 'admin_nodeInfo',
          params: []
        })
      );

      ipcProvider.on('data', function(data) {
        data = data.toString();
        data = JSON.parse(data);

        if (data.id === id) {
          expect(data.error).to.be.defined;
          expect(data.error.code).to.be.equal(-32601);

          done();
        }
      });
    });
  });
});
