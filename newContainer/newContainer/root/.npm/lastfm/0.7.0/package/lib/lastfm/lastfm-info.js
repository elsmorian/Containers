var LastFmBase = require("./lastfm-base");

var LastFmInfo = function(lastfm, type, options) {
  var that = this;
  options = options || {};
  LastFmBase.call(this);

  registerEventHandlers(options);
  requestInfo(type, options);

  function registerEventHandlers(options) {
    if (options.error) {
      that.on("error", options.error);
    }
    if (options.success) {
      that.on("success", options.success);
    }
    that.registerHandlers(options.handlers);
  }

  function requestInfo(type, options) {
    if (!type) {
      that.emit("error", new Error("Item type not specified"));
      return;
    }

    var params = that.filterParameters(options, ["error", "success", "handlers"])
      , method = type + ".getinfo"
      , request = lastfm.request(method, params);
    request.on("success", success);
    request.on("error", error);
  }

  function success(response) {
    if (response[type]) {
      that.emit("success", response[type]);
      return;
    }
    that.emit("error", new Error("Unexpected error"));
  }
  
  function error(error) {
    that.emit("error", error);
  }
};

LastFmInfo.prototype = Object.create(LastFmBase.prototype);

module.exports = LastFmInfo;
