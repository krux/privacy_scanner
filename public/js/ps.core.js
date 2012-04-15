if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.core = (function ($) {
  var _self,
    cache;

  _self = {

    getHar: function(url) {
      if (PS.utils.isUrl(url)) {
        $('form p.error').slideUp(75);
        $.ajax({
          dataType: 'json',
          url: PS.config.ajaxPrefix + '/news.yahoo.com.json',
          success: function(data){
            cache = data;
          }
        });
      } else {
        _self.messageUser({
          selector: 'form p.message',
          type: 'error',
          message: 'Hmmm...not a great URL dude.'
          
        });
      }
    },

    messageUser: function(options) { 
      var settings = {
        selector: 'p.error',
        message: 'Error',
        type: 'error'
      };

      if (options) {
        $.extend(settings, options);
      }

      $(settings.selector).html(settings.message).addClass(settings.type).slideDown(75);
    },

    getParentIDs: function() {
      var parents,
        parentIds,
        cleanParents;

      cleanParents = [];
      
      parentIds = _.pluck(cache.log.entries, 'parentid');
      parents = _.uniq(parentIds);
      _.each(parents, function(num){
        if (num !== null) {
          cleanParents.push(num);
        }
      });

      return cleanParents;
    },

    returnHar: function(data) {
      return cache;
    }

  };

  return _self;

})(jQuery);
