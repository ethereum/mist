const _ = (module.exports = require('underscore'));
const uuid = require('uuid');
const underscoreDeepExtend = require('underscore-deep-extend');

_.mixin({
  /**
   * Get a deeply nested object property.
   *
   * @param {Object} obj The object.
   * @param {String} path The path within the object to fetch.
   * @param {*} fallbackValue The value to return if given path not found.
   *
   * @return {*} Returns value if found; otherwise the fallbackVAlue.
   */
  get(obj, path, fallbackValue) {
    if (this.isUndefined(obj) || obj === null || typeof path !== 'string') {
      return fallbackValue;
    }

    const fields = path.split('.');
    let result = obj;

    for (let i = 0; i < fields.length; ++i) {
      if (!this.isObject(result) && !this.isArray(result)) {
        return fallbackValue;
      }

      result = result[fields[i]];
    }

    return result || fallbackValue;
  },
  deepExtend: underscoreDeepExtend(_),
  uuid() {
    return uuid.v4();
  }
});

module.exports = _;
