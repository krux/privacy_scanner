if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.core = (function ($) {
  var _self;

  _self = {

    getHar: function() {
      $.ajax({
        dataType: 'json',
        url: PS.config.ajaxPrefix + '/news.yahoo.com.json',
        success: function(data){
          console.log(data);
        }
      });
    }

  };

  return _self;

})(jQuery);