import { assert } from 'chai';
import {
  formatTokenCount,
  formatFunctionName
} from '../../../interface/utils/formatters';

describe('the formatter util', () => {
  context('formatTokenCount', () => {
    it('returns a string', () => {
      assert.equal(formatTokenCount(1000000000000000000, 18), '1');
    });

    it('handles fractions of tokens', () => {
      assert.equal(formatTokenCount(1000000000000000, 18), '0.001');
    });

    it('handles empty strings', () => {
      assert.equal(formatTokenCount('', 18), '0');
    });

    it('handles negatives', () => {
      assert.equal(formatTokenCount(-1500000000000000000, 18), '-1.5');
    });
  });

  context('formatFunctionName', () => {
    const fn = n => formatFunctionName(n);

    it('should handle empty param', () => {
      assert.equal(fn(''), '');
    });

    it('should handle a basic scenario', () => {
      assert.equal(fn('approve()'), 'approve');
    });

    it('should separate words', () => {
      assert.equal(fn('transferFrom()'), 'transfer from');
    });

    it('should separate numbers', () => {
      assert.equal(fn('splitTo2()'), 'split to 2');
    });

    it('should mix letters and numbers', () => {
      assert.equal(fn('transfer20Shares()'), 'transfer 20 shares');
    });

    it('should split function names with underscore', () => {
      assert.equal(fn('send_payload()'), 'send payload');
    });

    it('should split function names with multiple underscores', () => {
      assert.equal(
        fn('send__payload__to_blockchain()'),
        'send payload to blockchain'
      );
    });

    it('should handle acronyms', () => {
      assert.equal(fn('setURL()'), 'set url');
    });

    it('all caps function names should return as a single word', () => {
      assert.equal(fn('IDONOTFOLLOWRULES()'), 'idonotfollowrules');
    });

    it('should fire meaninful error when no parameters are passed', () => {
      assert.throws(fn, 'formatFunctionName() expects a non-empty string');
    });
  });
});
