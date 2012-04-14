/* vim: set tabstop=4 expandtab: */

var HarTreeView = {
  imageBase: "/vendor/treeview/images/"
};

// Overwrite with how you want the emssages displayed
HarTreeView.debug = function(msg){};

HarTreeView.findCompany = function (url) {

    // Walk through the display companies looking for a matching name
    try {
        //-= In the browser, accessing this via the global Companies takes >2s per lookup
        var kc = window.KRUXCompanies == undefined ? Companies : window.KRUXCompanies;
    } catch (e){
        return false;
    }

    if (url.match(/https?:\/\/ad\.(\w\w\.)?doubleclick\.net\//i)) {
        var paths = url.replace(/https?:\/\/ad\.(\w\w\.)?doubleclick.net\//, '').split('/');
        if (paths[0].match(/ad(?:j|i)/)) {
            url = 'dfp.doubleclick.net/';
            if (paths[2] !== undefined && paths[2].match(/[A-Z]\d{7,8}\.\d{1,3}/)) {
              //-= it's actually dfa
              url = 'dfa.doubleclick.net';
            }
        } else {
            //-= DFP V6
            url = 'dfp.doubleclick.net';
        }
    }

    var u = HarTreeView.getUrlForCompanyMatch(url);

    for (var i = 0, len = kc.length; i < len; i++){
        try {
            if (! kc[i].re) {
                // it's expensive, only do it once
                kc[i].re = new RegExp(kc[i].pattern, "i");
            }
            if (kc[i].re.test(u)){
                return kc[i].name;
            }
        } catch (e) {
            HarTreeView.debug("The pattern '" + kc[i].pattern + "' threw an error for " + kc[i].name);
            HarTreeView.debug("Error: " + e.message);
        }
    }
    return false;
};

/* We can't match the entire url, because it may have the referrer passed in the query string.
 * However, we also can't match on the domain name, because some companies may have multiple services
 * on the same url. Notably Google/Doubleclick. The compromise is to match on domain/firstdir
 *
 * Deal with:
 * http://www.kruxdigital.com/
 * http://www.kruxdigital.com:2091/
 * http://user@www.kruxdigital.com:2091/
 * http://user:pass@www.kruxdigital.com:2091/
 * https://www.kruxdigital.com/
 * http://www.kruxdigital.com/one?asdf
 * http://www.kruxdigital.com/one/?asdf
 * http://www.kruxdigital.com/one/two?asdf
 * http://ad.doubleclick.net/adj/nbcu.nbc/home;site=nbc;sect=home;!category=home;!category=js;!category=nbc;network=tvn;sz=728x90,970x66;tagtype=js;dcopt=ist;uri=;pos=1;tile=1;pm=1;ord=759154140523? // ? at the end
 * http://pixel.quantserve.com/pixel;r=1243515&url=http://www.brainyquote.com/ // Note no "?"
 */
HarTreeView.getUrlForCompanyMatch = function(url) {
    var m = url.match(/https*:\/\/[^\/]+\/[^?;&=]*/);
    if (m) {
        return m[0];
    } else {
        // Better to return something than fail altogether
        return url.replace(/\?.*$/, '');
    }
};


/* For the supplied har branch, look at content type and http headers to determine which icon to use */
HarTreeView.getContentTypeIcon = function (branch) {
        if (branch.is_redirect) {
                return "redirect.gif";
        } else {
                // TODO: Change this to use Firebug's groupings
                switch(branch.response.content.mimeType){
                  case 'text/html': return "html.png";
                  case 'text/plain': return "text.png";
                  case 'text/xml': return "xml.gif";
                  case 'text/css': return "css.png";
                  case 'application/x-javascript': return "js.gif";
                  case 'application/javascript': return "js.gif";
                  case 'application/json': return "js.gif";
                  case 'text/javascript': return "js.gif";
                  case 'image/gif': return "images.png";
                  case 'image/png': return "images.png";
                  case 'image/jpg': return "images.png";
                  case 'image/jpeg': return "images.png";
                  case 'application/x-shockwave-flash': return "flash.gif";
                  default: return null;
                }
        }
};


/* Build an html representation of a har tree */
HarTreeView.toHTML = function(branch, root){
    if (! branch ) {
        return;
    }
    var h = [], display = null, from = '', context = root.context;// window.content.document || window.document;
    var domain = HarParser.getDomainPrefix(branch.request.url);
    //-= For the tree filtering ckbxs apply additional css classes to only those elements that have no kids
    if ((branch.children === undefined || branch.request.url.match(/\.css$/)) && (HarParser.get2ndLevelDomain(domain) == HarTreeView.base_domain)) {
        from = 'same_domain';
    }
    if (branch.attribution_method.match(/from css/i) || branch.request.url.match(/\.css$/)) {
        from += ' css_bg';
    }
    var id, pid, subTree;
    id = 'n'+ new Date(branch.startedDateTime).getTime().toString().replace(/^[0-9]{6}/, '');
    if (branch.id == '0') {
      HarTreeView.base_domain = domain;
      pid = 'harTree';
      subTree = jQuery('#'+ pid, context);
    } else {
      pid = 'p'+ id;
      subTree = jQuery('#'+ pid, context);
    }
    //-= If the <ul> container for this li is not declared, create it, else re-use it
    if (subTree === null || subTree[0] === undefined) {
      subTree = jQuery('<ul id="'+ pid  +'" class="'+ from +'"> </ul>', context);
      root.append(subTree);
    }
    var row = jQuery('#'+ id, context);
    try {
      if (row === null || row[0] === undefined) {
        row =  jQuery('<li class="treeLeaf" id="'+ id +'"> </li>', context);
        subTree.append(row);
      } else {
        if (branch.children){
          for (var idd in branch.children){
            HarTreeView.toHTML(branch.children[idd], row);
          }
        }
        return;
      }
    } catch (e) {
    }
    //-= Proceed to setup this node it does not exist yet..
    if (branch.parentid !== null && branch.parentid > 0) {
        var confidenceIcon;
        if (branch.confidence == 100){
            confidenceIcon = "tick-circle.png";
        } else if (branch.confidence >= 85){
            confidenceIcon = "tick-white.png";
        } else {
            confidenceIcon = "question-white.png";
        }
        row.append('<img src="' + HarTreeView.imageBase + confidenceIcon + '"/> ');
    }
    display = HarTreeView.findCompany(branch.request.url);
    if (! display) {
        // No title/company found, use the url, with the extra stuff removed
        try {
            var urlNoQstring = branch.request.url.replace(/\?.*$/, '');
            var fileMatch = urlNoQstring.match(/[^\/]+$/);
            if (fileMatch) {
                display = domain + '/.../' + fileMatch[0];
            } else {
                display = branch.request.url;
            }
        } catch(e) {
            display = branch.request.url;
        }
    }
    var entry = jQuery("<span id='entry_" + branch.id + "' class='url_display'> </span>", context);
    var data = {};
    for (var prop in branch) {
        //-= Clone everything but the children sub tree
        if (prop !== 'children') {
            data[prop] = branch[prop];
        }
    }
    //-= Attach the har data for the given entry to the current row for convient event processing
    entry.data(data);
    entry.append('<span title="' + branch.request.url + '">' + display + '</span>');
    row.append(entry);
    // Link to display the content, behaving differently depending on content type
    var icon = HarTreeView.getContentTypeIcon(branch) || "unknown.gif", img;
    var title = branch.response.content.mimeType + ", click to open in a new window";
    var anchor = jQuery("<span> <a target='_blank' href='" + branch.request.url + "' title='" + title + "'><img src='" + HarTreeView.imageBase + icon + "' border='0'/></a> </span>", context);
    row.append(anchor);
    if (branch.request.cookies.length > 0 || branch.response.cookies.length > 0){
        img = jQuery("<span> <img class='tree_cookies' id='cookie_" + branch.id + "'  src='" + HarTreeView.imageBase + "cookies.png' title='Cookies set-read by this request'/> </span>", context);
        row.append(img);
    }
    if (HarParser.isCollectorRequest(branch, HarTreeView.base_domain)){
        img = jQuery("<span> <img id='collector_" + branch.id + "'  src='" + HarTreeView.imageBase + "database-share.png' title='This request appears to be collecting data'/> </span>", context);
        row.append(img);
    }
    row.append("<div class='tabViewBody kruxRequestBody' id='rb_" + branch.id + "' style='display:none'></div>");
    if (branch.children){
        for (id in branch.children) {
            HarTreeView.toHTML(branch.children[id], row);
        }
    }

};


/* Build an html representation of a har tree */
HarTreeView.htmlHarTree = function(branch, htmlId){
        if (! branch ) {
            return "";
        }
        var h = [], display = null, from = '';
        var domain = HarParser.getDomainPrefix(branch.request.url);
        if (branch.id == '0') {
            HarTreeView.base_domain = HarParser.get2ndLevelDomain(domain);
        }
        //-= For the tree filtering ckbxs apply additional css classes to only those elements that have no kids
        if ((branch.children === undefined || branch.request.url.match(/\.css$/)) && (HarParser.get2ndLevelDomain(domain) == HarTreeView.base_domain)) {
          from = 'same_domain';
        }
        if (branch.attribution_method.match(/from css/i) || branch.request.url.match(/\.css$/)) {
          from += ' css_bg';
        }

        if (htmlId) {
                h.push("<ul id='" + htmlId + "' class='"+ from +"'>");
        } else {
                h.push("<ul class='"+ from +"'>");
        }
        h.push("<li class='treeLeaf'>");
        // TODO: For the first entry, display the title of the page instead of the url
        if (branch.parentid === null ){
                h.push(""); // noop
        } else if (branch.parentid == -1) {
                h.push('<img src="' + HarTreeView.imageBase + 'unknown-usher.png"/> ');
        } else {
                var confidenceIcon;
                if (branch.confidence == 100){
                    confidenceIcon = "tick-circle.png";
                } else if (branch.confidence >= 85){
                    confidenceIcon = "tick-white.png";
                } else {
                    confidenceIcon = "question-white.png";
                }
                h.push('<img src="' + HarTreeView.imageBase + confidenceIcon + '"/> ');
        }

        display = HarTreeView.findCompany(branch.request.url);

        if (! display) {
                // No title/company found, use the url, with the extra stuff removed
                try {
                        var urlNoQstring = branch.request.url.replace(/\?.*$/, '');
                        var fileMatch = urlNoQstring.match(/[^\/]+$/);
                        if (fileMatch) {
                            display = domain + '/.../' + fileMatch[0];
                        } else {
                            display = branch.request.url;
                        }
                } catch(e) {
                        display = branch.request.url;
                }
        }
        var bgcolor;
        if (branch.time < 251) {
            bgcolor = 1;
        } else if (branch.time < 401) {
            bgcolor = 2;
        } else if (branch.time < 601) {
            bgcolor = 3;
        } else if (branch.time < 801) {
            bgcolor = 4;
        } else if (branch.time < 1001) {
            bgcolor = 5;
        } else if (branch.time > 1000) {
            bgcolor = 6;
        }
        h.push("<span id='entry_" + branch.id + "' class='url_display'>");
        h.push('<span title="' + branch.request.url + ' ('+ branch.time +'ms)">' + display + '</span>');
        h.push("</span>");
        // Link to display the content, behaving differently depending on content type
        var icon = HarTreeView.getContentTypeIcon(branch) || "unknown.gif";
        var title = branch.response.content.mimeType + ", click to open in a new window";

        h.push(" ");
        if (bgcolor > 1) {
            h.push('<div class="threat latency_'+ bgcolor +'">'+ branch.time +'ms</div>');
        }
        h.push("<a target='_blank' href='" + branch.request.url + "' title='" + title + "'><img src='" + HarTreeView.imageBase + icon + "' border='0'></a>");
        if (branch.request.cookies.length > 0 || branch.response.cookies.length > 0){
                h.push(" <img class='tree_cookies' id='cookie_" + branch.id + "' src='" + HarTreeView.imageBase + "cookies.png' title='Cookies set/read by this request'>");
        }
        if (HarParser.isCollectorRequest(branch, HarTreeView.base_domain)){
            h.push(" <img id='collector_" + branch.id + "'  src='" + HarTreeView.imageBase + "database-share.png' title='This request appears to be collecting data'/> </span>");
        }
        h.push("<div class='tabViewBody kruxRequestBody' id='rb_" + branch.id + "' style='display:none'></div>");
        if (branch.children){
                for (var id in branch.children){
                        h.push(HarTreeView.htmlHarTree(branch.children[id]));
                }
        }
        h.push("</li>");
        h.push("</ul>");
        //-= Note: this method of string concatenation is not necessary because strings in Javascript do not thrash the literal pool like they do in Java
        //-= The efficiency of this method is either moot or less efficient in Safari: http://blogs.sitepoint.com/2010/09/14/javascript-fast-string-concatenation/
        return h.join("");
};


HarTreeView.htmlHeader = function(domchecked, csschecked) {
    var header = '<div id="treecontrol">' +
      '<a title="Collapse the entire tree below">' +
      '<img src="' + HarTreeView.imageBase + 'twistyOpen.png" /> Collapse All</a>' +
      '<a title="Expand the entire tree below">' +
      '<img src="' + HarTreeView.imageBase + 'twistyClosed.png" /> Expand All</a> ' +
      ' - <span style="color:#999; font-size:smaller"><i>Something not looking right? Try refreshing.</i></span>' +
      '<span id="exposer_button" title="Expose off-site resources on this page." style="display: none;">Expose</span>'+
      '<span id="treefilters">'+
        '<b>Include:</b>' +
        '<input type="checkbox" id="cksame_domain" '+ (domchecked ? 'checked="true" ' : '') +'/><label for="cksame_domain">*.' + HarTreeView.base_domain + '</label>'+
        '<input type="checkbox" id="ckcss_bg" '+ (csschecked ? 'checked="true" ' : '') +'/><label for="ckcss_bg">CSS Images</label>'+
      '</span>'+
    '</div>';
    try {
      //Firebug;
      header += '<img src="'+ HarTreeView.imageBase +'lgo-krux.png" class="tree_krux_logo"/>';
    } catch (e) { /* Don't show a logo on the web-side, it is redundant redundancy */ }
    header += '<div class="tree_legend"><div class="legend_header" title="The type of request, as determined by the content type header. Data Collection requests are those that look like they are only there for sharing data.">Request Types</div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'html.png"/><div class="tree_caption">HTML</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'xml.gif"/><div class="tree_caption">XML</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'js.gif"/><div class="tree_caption">Javascript</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'css.png"/><div class="tree_caption">CSS</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'text.png"/><div class="tree_caption">Text</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'images.png"/><div class="tree_caption">Image</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'flash.gif"/><div class="tree_caption">Flash</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'redirect.gif"/><div class="tree_caption">Redirect</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'cookies.png"/><div class="tree_caption">Cookies</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'unknown.gif"/><div class="tree_caption">Unknown</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'database-share.png"/><div class="tree_caption">Data&#160;Collector</div></div>'+
      '<div class="legend_header" style="padding-top: 8px;" title="How certain we are about the source of this request.">Attribution</div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'tick-circle.png"/><div class="tree_caption">Sure</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'tick-white.png"/><div class="tree_caption">Pretty&#160;sure</div></div>'+
      '<div class="tree_key"><img src="'+ HarTreeView.imageBase  +'question-white.png"/><div class="tree_caption">Not&#160;so&#160;sure</div></div>'+
    '</div>';
    return header;
};
