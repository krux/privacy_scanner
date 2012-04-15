if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.utils = (function ($) {
  var _self;

  _self = {

    isUrl: function(urlString) {
      var regex = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi);

      if (urlString.match(regex)) {
        return true;
      } else {
        return false;
      }
    },

    ensureProtocal: function(urlString) {
      var regex = /^(http|https):///;

      if (urlString.match(regex)) {
        return urlString;
      } else {
        return 'http://' + urlString;
      }
    }
  };

  return _self;

})(jQuery);
