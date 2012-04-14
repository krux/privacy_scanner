if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.core = (function ($) {
  var _self;

  _self = {

    getHar: function() {
      $.ajax({
        url: 'http://www.privacyscanner.org/static/javascript.wikia.com.json',
        dataType: 'json',
        success: function(json){
          console.log(json);
        }
      });
    }

  };

  return _self;

})(jQuery);