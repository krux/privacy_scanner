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
    }
  };

  return _self;

})(jQuery);
