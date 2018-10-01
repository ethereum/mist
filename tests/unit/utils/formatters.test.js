import { assert } from 'chai';
import { formatTokenCount } from '../../../interface/utils/formatters';

describe('the formatter util', () => {
  context('formatTokenCount', () => {
    it('returns a string', () => {
      assert.equal(formatTokenCount(1000000000000000000, 18), '1');
    });

    it('handles fractions tokens', () => {
      assert.equal(formatTokenCount(1000000000000000, 18), '0.001');
    });

    it('handles empty strings', () => {
      assert.equal(formatTokenCount('', 18), '0');
    });

    it('handles negatives', () => {
      assert.equal(formatTokenCount(-1500000000000000000, 18), '-1.5');
    });
  });
});
