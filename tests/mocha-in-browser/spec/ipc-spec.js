// implement chai's should interface
var expect = chai.expect;
var idCount = 500;

describe("IPC connection", function() {

    describe('ipcProvider', function() {

        it('shouldn\'t allow admin functionality [sync]', function() {
            var id = idCount++;

            ipcProvider.connect();

            var data = ipcProvider.writeSync(JSON.stringify({
                "jsonrpc": "2.0",
                "id": id,
                "method": "admin_nodeInfo",
                "params": []
            }));

            data = data.toString();
            data = JSON.parse(data);

            console.log(data);

            expect(data.id).to.be.equal(id);
            expect(data.error).to.be.defined;
            expect(data.error.code).to.be.equal(-32601);
        });

        it('shouldn\'t allow admin functionality [sync, batch request]', function() {
            var id = idCount++;

            ipcProvider.connect();

            var data = ipcProvider.writeSync(JSON.stringify([{
                "jsonrpc": "2.0",
                "id": id,
                "method": "admin_nodeInfo",
                "params": []
            },{
                "jsonrpc": "2.0",
                "id": id + 1,
                "method": "eth_accounts",
                "params": []
            }]));

            data = data.toString();
            data = JSON.parse(data);

            expect(data[0].id).to.be.equal(id);
            expect(data[0].error).to.be.defined;
            expect(data[0].error.code).to.be.equal(-32601);

            expect(data[1].id).to.be.equal(id + 1);
            expect(data[1].result).to.be.defined;
        });

        it('shouldn\'t allow admin functionality [async]', function(done) {
            var id = idCount++;

            ipcProvider.connect();

            ipcProvider.write(JSON.stringify({
                "jsonrpc": "2.0",
                "id": id,
                "method": "admin_nodeInfo",
                "params": []
            }));

            ipcProvider.on('data', function(data){
                data = data.toString();
                data = JSON.parse(data);

                if(data.id === id) {
                    expect(data.error).to.be.defined;
                    expect(data.error.code).to.be.equal(-32601);

                    done();
                }
            });
        });

        it('shouldn\'t allow admin functionality [async, batch request]', function(done) {
            var id = idCount++;

            ipcProvider.connect();

            ipcProvider.write(JSON.stringify([{
                "jsonrpc": "2.0",
                "id": id,
                "method": "admin_nodeInfo",
                "params": []
            },{
                "jsonrpc": "2.0",
                "id": id + 1,
                "method": "eth_accounts",
                "params": []
            }]));

            ipcProvider.on('data', function(data){

                data = data.toString();
                data = JSON.parse(data);

                if(data[0] && data[0].id === id) {

                    expect(data[0].id).to.be.equal(id);
                    expect(data[0].error).to.be.defined;
                    expect(data[0].error.code).to.be.equal(-32601);

                    expect(data[1].id).to.be.equal(id + 1);
                    expect(data[1].result).to.be.defined;

                    done();
                }
            });
        });
    });
});
