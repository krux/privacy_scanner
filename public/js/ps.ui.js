if (typeof PS === 'undefined' || !PS) {
  var PS = {};
}

PS.ui = (function ($) {
  var _self;

  _self = {

    tabs: function(tabRoot) {
      var $root = (typeof tabRoot !== 'undefined') ? $(tabRoot) : $('[data-role="tabs-module"]');
      var $tabs = $root.find('[data-role="tabs"]');
      var $panels = $root.find('[data-role="panel"]');
      var $currentTab;
      var $currentPanel;

      function swapPanel(tab) {
        var panel = tab.attr('href');
        $currentPanel.removeClass('current');
        $currentPanel = $('[data-panel-id="' + panel + '"]');
        $currentPanel.addClass('current');
      }

      function swapTab(panel) {
        var tab = $panels
      }

      function showFirst() {
        $currentPanel = $panels.first();
        $currentTab = $tabs.find('li:first-child a');
        $currentTab.addClass('current');
        $currentPanel.addClass('current');
      }

      showFirst();

      //calls function
      $('a', $tabs).live('click', function(evt) {
        var tab = $(this);
        $tabs.find('a').removeClass('current');
        tab.addClass('current');
        swapPanel(tab);
        evt.preventDefault();
      });
    },

    overlay: {
      init: function (triggerElem) {
        overlay.trigger = typeof triggerElem !== 'undefined' ? $(triggerElem) : $('[data-role="overlay-trigger"]');
        var overlayEl;

        overlay.trigger.click(function (evt) {
          evt.preventDefault();
          overlayEl = $(this).data('overlay');
          overlay.open($(overlayEl));
        })
      },

      open: function (overlayEl) {
        var mask = $('#overlay-mask');

        mask.fadeIn('1000');
        overlay.positionOverlay(overlayEl);
        overlay.fadeIn('fast');
        overlay.setUpCloseClickHandlers(mask, overlayEl);
        overlay.setUpCloseClickHandlers(overlayEl.find('.close'), overlayEl);
      },

      positionOverlay: function (overlayEl) {
        var winH = $(window).height(),
            winW = $(window).width();

        //Set the popup window to center
        overlayEl.css('top',  winH/2 - overlayEl.height()/2);
        overlayEl.css('left', winW/2 - overlayEl.width()/2);
      },

      setUpCloseClickHandlers: function ($elem, overlayEl) {
        $elem.click(function () {
          overlay.close(overlayEl);
        });
      },

      close: function (overlayEl) {
        $('#overlay-mask').hide();
        overlayEl.hide();
      }
    }
  };

  return _self;

})(jQuery);
