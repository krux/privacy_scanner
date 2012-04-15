$(document).ready(function() {
    // Har data can come from the url, the textarea, or drag and drop
    $treeView = $("#treeView")
    //var pathMatch = window.location.search.match(/path=([^&;]+)/);
    //if (pathMatch) {
        // Path supplied in the url
        //var downloadDiv = $('<div><a href="' + pathMatch[1] + '?attachment=1"><img src="/public/images/download.png"> Download har file</a></div>').hide();
        //$("#har_section").prepend(downloadDiv);
        //downloadDiv.fadeIn();
        //$("#summary").html("Loading har file...");
        //$("body").addClass("loading");
        /*$.ajax({
            url: 'mock_data/news.yahoo.com.json',
            dataType: "text", // otherwise jquery will parse it as json, which we do ourselves.
            success: function(data){
                $("#summary").html("");
                processTreeView(data, $treeView);
                $("body").removeClass("loading");

                $("#rawHarData").val(data);
            },
            error: function() {
                $("#summary").html("Error loading har file");
                $("body").removeClass("loading");
            }
        });*/
    //}

    $("#treeViewButton").click(function(){
        $("#summary").html("Processing...");
        processTreeView($("#rawHarData").val(), $treeView);
        $("#summary").html("");
    });

    $("#netViewButton").click(function(){
        $("#summary").html("Processing...");
        processNetView($("#rawHarData").val(), $treeView);
        $("#summary").html("");
    });

    /*if ($().droppedIsSupported()) {
        $("#dnd").html("Or Drag and Drop your har file into the window");
        $().dropped({
            onDrop: function(fileName, fileSize) {
                $("#summary").html("Processing... " + fileName + "<br/>");
            },
            onLoad: function(fileData) {
                $("#summary").fadeOut();
                $("#rawHarData").val(fileData);
                processTreeView(fileData, $treeView);
            }
        });
    }*/
});

function processTreeView(input, container) {
    try {
        var har = window.JSON.parse(input);
    } catch (e) {
        window.console && console.log(e);
        container.html("Invalid Har Data (could not process)");
        return;
    }
  var treeHar = HarParser.parseTreeFromHar(har);
    if (! treeHar) {
        container.html("Invalid Har File");
        return;
    }

    // htmlHarTree must be called before header so HarTreeView.base-domain gets populatd for #treefilters
    var treeHtml = HarTreeView.htmlHarTree(treeHar, "harTree");
  container.fadeOut("fast").html(HarTreeView.htmlHeader() + treeHtml);

    $("#harTree").treeview({
        control: "#treecontrol",
        // Forward propogating a hack. Set this or it will invert the +/-
        from_inspector: true,
        animated: "fast"
    });

    container.fadeIn();

    // Set up click handlers for displaying headers
    $('#harTree').find('.url_display').bind('click', function(evt, tab) {
      var id = this.id.replace('entry_', '');
      for (var i = 0; i < har.log.entries.length; i++) {
        if (i == id){
          entry = har.log.entries[i];
          break;
        }
      }
      var template = $('#net_panel').clone();
      var panel = $('#harTree').find("#rb_" + id);
      $(template).show();
      panel.html(template);
      var body = panel.find('.netInfoResponseHeadersBody');
      body.html('');
      //-= Paint the headers view
      $(entry.response.headers).each(function() {
          var row = '<tr role="listitem" class=" "><td role="presentation" class="netInfoParamName "><span class=" ">'+ this.name +'</span></td>';
          row +='<td role="list" aria-label="Date" class="netInfoParamValue "><code role="listitem" class="focusRow subFocusRow ">'+ this.value +'</code></td></tr>';
          body.append(row);
      });
      body = panel.find('.netInfoCookiesHeadersBody');
      body.html('');
      $(entry.request.cookies).each(function() {
          var row = '<tr role="listitem" class=" "><td role="presentation" class="netInfoParamName "><span class=" ">'+ this.name +'</span></td>';
          row +='<td role="list" aria-label="Date" class="netInfoParamValue "><code role="listitem" class="focusRow subFocusRow ">'+ this.value +'</code></td></tr>';
          body.append(row);
      });
      body = panel.find('.netInfoCookiesHeadersBody2');
      body.html('');
      $(entry.response.cookies).each(function() {
          var row = '<tr role="listitem" class=" "><td role="presentation" class="netInfoParamName "><span class=" ">'+ this.name +'</span></td>';
          row +='<td role="list" aria-label="Date" class="netInfoParamValue "><code role="listitem" class="focusRow subFocusRow ">'+ this.value +'</code></td></tr>';
          body.append(row);
      });
      panel.fadeToggle("fast");

    });
    $('#harTree').find('.tree_cookies').css({cursor: "pointer"}).click(function() {
      $(this).closest('li').find('> .url_display').trigger('click');
    });
}