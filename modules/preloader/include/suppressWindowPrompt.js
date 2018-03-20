module.exports = () => {
  window.prompt = () => {
    console.warn("Mist doesn't support window.prompt()");
  };
};
