if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.core = (function ($) {
  var _self,
    cache;

  _self = {

    getHar: function(url) {
      $.ajax({
        dataType: 'json',
        url: PS.config.ajaxPrefix + '/news.yahoo.com.json',
        success: function(data){
          cache = data;
        }
      });
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