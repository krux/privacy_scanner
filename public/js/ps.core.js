if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.core = (function ($) {
  var _self;

  _self = {

    getHar: function(url) {
      $.ajax({
        dataType: 'json',
        url: PS.config.ajaxPrefix + '/news.yahoo.com.json',
        success: function(data){
          _self.getParents(data);
        }
      });
    },

    getParents: function(data) {
      var parents,
        parentIds,
        cleanParents;

      cleanParents = [];
      
      parentIds = _.pluck(data.log.entries, 'parentid');
      parents = _.uniq(parentIds);
      _.each(parents, function(num){
        if (num !== null) {
          cleanParents.push(num);
        }
      });

      console.log(cleanParents);
    },

    returnHar: function(data) {
      return data;
    }

  };

  return _self;

})(jQuery);