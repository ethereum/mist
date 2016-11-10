
module.exports = function () {
    window.prompt = function () {
        console.warn('Mist doesn\'t support window.prompt()');
    };
};
