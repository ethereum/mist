// implement chai's should interface
var expect = chai.expect;

describe('General', function() {
  describe('window.prompt()', function() {
    it('should not throw errors', function() {
      expect(window.prompt).to.not.throw(Error);
    });
  });

  describe('mist', function() {
    it("shouldn't expose dirname", function() {
      expect(mist.dirname).to.be.undefined;
    });

    it("shouldn't expose shell", function() {
      expect(mist.shell).to.be.undefined;
    });

    it('should contain only allowed attributes', function() {
      var allowedAttributes = [
        'callbacks',
        'version',
        'license',
        'platform',
        'requestAccount',
        'sounds',
        'menu',
        'solidity'
      ];

      expect(mist).to.have.all.keys(allowedAttributes);
    });

    it('should return platform', function() {
      expect(mist.platform).to.be.oneOf([
        'darwin',
        'win32',
        'freebsd',
        'linux',
        'sunos'
      ]);
    });

    it('should report solidity version', function() {
      expect(mist.solidity.version).to.match(/^\d\.\d{1,2}\.\d{1,2}$/); // match examples: 0.4.6, 0.5.10, 0.10.0
    });
  });

  describe('mist.menu', function() {
    before(function() {
      mist.menu.clear();
    });

    afterEach(function() {
      mist.menu.clear();
    });

    it('add() should return false when params are incorrect', function() {
      expect(mist.menu.add()).to.be.false;
      expect(mist.menu.add('mydappmenu')).to.be.false;
      expect(mist.menu.add('mydappmenu', {})).to.be.false;
    });

    it('add() should return true when successful', function() {
      expect(mist.menu.add('mydappmenu', { name: 'MyMenu' })).to.be.true;
      expect(
        mist.menu.add(
          'mydappmenu',
          { name: 'MyMenu', position: 1 },
          function() {}
        )
      ).to.be.true;
    });

    it('add() should update menu entries', function() {
      mist.menu.add('menu0', {
        name: 'Test1',
        selected: true,
        position: 1
      });

      mist.menu.update('menu0', {
        name: 'Test1234',
        selected: false,
        position: 12
      });

      expect(mist.menu.entries.entry_menu0).to.eql({
        id: 'entry_menu0',
        position: 12,
        name: 'Test1234',
        selected: false,
        badge: undefined
      });
    });

    it('should be selectable', function() {
      mist.menu.add('menu0', { name: 'Test1', selected: true });
      mist.menu.add('menu1', { name: 'Test2' });

      mist.menu.select('menu1');

      expect(mist.menu.entries.entry_menu0.selected).to.be.false;
      expect(mist.menu.entries.entry_menu1.selected).to.be.true;
    });

    it('remove() should remove menu from entries', function() {
      mist.menu.add('menu0', { name: 'Test2' });
      mist.menu.add('menu1', { name: 'Test3' });
      mist.menu.add('menu2', { name: 'Test4' });

      expect(mist.menu.entries).to.have.all.keys(
        'entry_menu0',
        'entry_menu1',
        'entry_menu2'
      );
      mist.menu.remove('menu1');
      expect(mist.menu.entries).to.have.all.keys('entry_menu0', 'entry_menu2');
    });

    it('clear() should clear menu entries', function() {
      mist.menu.add('menu0', { name: 'Test1' });
      mist.menu.add('menu1', { name: 'Test2' });

      expect(mist.menu.entries).to.have.all.keys('entry_menu0', 'entry_menu1');

      mist.menu.clear();
      expect(mist.menu.entries).to.be.empty;
    });

    it('add() should be limited to 100 entries', function() {
      var i;
      // adding 100 entries
      for (i = 0; i < 100; i += 1) {
        mist.menu.add('menu' + i, { name: 'Test' + i });
      }
      expect(Object.keys(mist.menu.entries).length).to.equals(100);
      expect(
        mist.menu.add('menu 101', {
          name: 'Menu overflow'
        })
      ).to.be.false;
    });
  });
});
