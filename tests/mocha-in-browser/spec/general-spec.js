// implement chai's should interface
var expect = chai.expect;

describe('General', function () {
    describe('window.prompt()', function () {
        it('should not throw errors', function () {
            expect(window.prompt).to.not.throw(Error);
        });
    });

    describe('mist', function () {
        it('shouldn\'t expose dirname', function () {
            expect(mist.dirname).to.be.undefined;
        });

        it('shouldn\'t expose shell', function () {
            expect(mist.shell).to.be.undefined;
        });

        it('should contain only allowed attributes', function () {
            var allowedAttributes = [
                'callbacks',
                'version',
                'license',
                'platform',
                'requestAccount',
                'sounds',
                'menu',
            ];

            expect(mist).to.have.all.keys(allowedAttributes);
        });
    });

    describe('mist.menu', function () {
        var menuObj = {
            position: 0,
            selected: false,
            name: 'My dapp menu',
            badge: '0 eth',
        };

        var menuId = 0;

        var addMenu = function (selected = false, cb = null) {
            var obj = Object.assign({}, menuObj);
            obj.selected = selected;
            obj.position = menuId;
            obj.name = 'My dapp menu ' + menuId;
            mist.menu.add('menu' + menuId, obj, cb);

            return 'menu' + (menuId++);
        };

        beforeEach(function () {
            mist.menu.clear();
            menuId = 0;
        });

        it('add() should return false when params are incorrect', function () {
            expect(mist.menu.add()).to.be.false;
            expect(mist.menu.add('mydappmenu')).to.be.false;
            expect(mist.menu.add('mydappmenu', {})).to.be.false;
        });

        it('add() should return true when successful', function () {
            expect(mist.menu.add('mydappmenu', menuObj)).to.be.true;
            expect(mist.menu.add('mydappmenu', menuObj, function () {})).to.be.true;
        });

        it('should be selectable', function () {
            addMenu(true);
            var menu1 = addMenu(false);

            mist.menu.select(menu1);
            expect(mist.menu.entries['entry_' + menu1].selected).to.be.true;
        });

        // it('add() should execute callback when selected', function (done) {
        //     mist.menu.add('mydappmenu', menuObj, function () {
        //         done();
        //     });
        // });

        it('remove() should remove menu from entries', function () {
            addMenu();
            var menu1 = addMenu();
            addMenu();

            expect(mist.menu.entries).to.have.all.keys('entry_menu0', 'entry_menu1', 'entry_menu2');
            mist.menu.remove(menu1);
            expect(mist.menu.entries).to.have.all.keys('entry_menu0', 'entry_menu2');
        });

        it('clear() should clear menu entries', function () {
            addMenu();
            addMenu();

            expect(mist.menu.entries).to.have.all.keys('entry_menu0', 'entry_menu1');
            mist.menu.clear();
            expect(mist.menu.entries).to.be.empty;
        });
    });

});











