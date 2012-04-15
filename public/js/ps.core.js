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
          dataType: 'jsonp',
          jsonp: 'jsoncallback',
          url: 'http://www.privacyscanner.org/api/v1/privacy/' + url,
          success: function(data){
            cache = data;
            $(document.body).trigger('harData', [data]);
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

    reportScore: function(score) {
      $('.score p').html(score).parent().addClass(_self.getScoreClass(score));
    },

    getScoreClass: function(score) {
      if (score >= 80) {
        return 'congrats';
      } else if (score <= 80 && score >= 70) {
        return 'warning';
      } else {
        return 'error';
      }
    },

    reportRecommendations: function(recommendations) {
      _.each(recommendations, function (item) {
        $('<li>', {
          html: '<h2><b>' + item.headline + '</b></h2><ul><li>' + item.desc + '</li></ul>'
        }).appendTo($('[data-role="recommendations"]'));
      });
    },

    hideTabs: function() {
      $('[data-role="tabs-module"]').slideUp(100);
    },

    showTabs: function() {
      $('[data-role="tabs-module"]').slideDown(100);
    },

    clearContent: function() {
      $('#treeView').html('');
      $('.recommendations ul').html('');
      $('#chart').html('');
    }

  };

  return _self;

})(jQuery);
