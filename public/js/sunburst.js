/* vim: set expandtab tabstop=2 shiftwidth=2: */
var w = 960,
    h = 650,
    r = Math.min(w, h) / 2,
    color = d3.scale.category20c();

var vis = d3.select("#chart").append("svg")
    .attr("width", w)
    .attr("height", h)
    .append("g")
    .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")");

var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, r * r])
    .value(function(d) { return 1; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

var url = /^#http/.test(location.hash) ? location.hash.replace(/^#/, '') : 'http://drknowledge.com';
d3.json("/api/v1/privacy/"+ url, function(json) {
  window.har = json;
  json = treeify(json);
  var path = vis.data([json]).selectAll("path")
      .data(partition.nodes)
      .enter().append("path")
      .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
      .attr("d", arc)
      .attr("id", function(d) { return d.id })
      .attr("fill-rule", "evenodd")
      .attr('title', function (d) { return d.company ? d.company : d.name})
      .style("cursor", function (d) { 
        var cursor, pc;
        if (d.companyid) {
          pc = window.har.companies[''+ d.companyid];
        }
        if (pc == null || pc.logo == null) {
          return 'default';
        }
        return 'pointer'; 
       })
      .style("stroke", function (d) { return d.is_collector ?  'rgba(255, 0, 0, 0.7)' : '#333333'})
      .style("fill", function(d) { return d.risk == 0 ? '#777777' : 'hsl('+  Math.abs(120  - (d.risk * 10) ) +', 70%, 60%)'}) 
      .each(stash);

});

function treeify(json) {
  var entries = json.log.entries,
    companies = json.companies,
    children = [];

  for (var i = 1; i < entries.length; i++) {
    var row = entries[i];
    row.children = [];
    row.name = row.request.url;
    var company = row.companyid ? companies[''+ row.companyid] : false;
    if (company) {
      row.company = company.name;
      row.risk = company.score; 
    } else {
      row.risk = 0;
    }
    if (row.parentid == 0 || row.parentid == null) {
      children.push(row);
    }
    for (var x = 1; x < entries.length; x++) {
      var row2 = entries[x];
      if (row2.parentid == row.id) {
        row.children.push(row2); 
      }
    }
  }

  var name = entries[0].request.url;
  var domain = entries[0].request.url.split(/\//)[2];
  for (var z = 0; z < children.length; z++) {
    var row = entries[z];
    if (row.children == undefined && row.request.url.match(domain)) {
      delete entries[z];
    }
  }
  return {name: name, children: children}; 
}

// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function arcTween(a) {
  var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  return function(t) {
    var b = i(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  };
}

//-= Jquery stuffs
$('path').live('click', function() {
  var data;
  for (key in  window.har.log.entries) {
    var row = window.har.log.entries[key];
    if (row.id == this.id) {
      data = row;
      break;
    }
  }
  var pc;
  if (data.companyid) {
    pc = window.har.companies[''+ data.companyid];
  }
  console.dir(pc);
  if (pc == null || pc.logo == null) {
    return;
  }

  //-= Fancy schmancy templating system.....
  $('body').append('<div id="lightbox"><div class="inner_wrapper"><a title="Close" id="close" href="#">Close</a><div class="pc_cell"><div class="pc_logo"></div><div class="pc_header">Industry Affiliations</div><div class="pc_affiliations"></div><div class="pc_header pc_privacy">Privacy Policy</div><div class="pc_privacy_policy"></div><div class="pc_header pc_opt">Opt Out</div><div class="pc_optout"></div><div class="pc_header">Anonymity</div><div class="pc_anonymity"></div><div class="pc_header">Sharing</div><div class="pc_sharing"></div><div class="pc_header">Boundaries</div><div class="pc_boundaries"></div><div class="pc_header">Deletion</div><div class="pc_deletion"></div></div><div class="pc_cell"><div class="pc_header">Domains</div><div class="pc_domains"></div><div class="pc_header">Collector Detail</div><div class="pc_self_desc">Self-description:</div><div class="self_description"></div><div class="pc_proud"><span class="pc_prod_caption">Tracking company data provided by</span> <img src="http://dataconsole.kruxdigital.com/public/images/privacy-choice-krux.png"/></div></div></div></div>');
  //-= Sorry for this hack, I'm not counting on having body { margin: 0; text-align: center; }
  $('.inner_wrapper').css('left', ($('body').width() - $('.inner_wrapper').width()) / 2);
  var m = $('.inner_wrapper');
  //-= OK so we have a legit Privacy Choice record, let's draw this puppy...
  var affiliations = [];

  if (pc.is_iab) {
    affiliations.push('IAB');
  }
  if (pc.is_iab_eurpoe) {
    affiliations.push('IAB EU');
  }
  if (pc.truste) {
    affiliations.push('Truste');
  }
  if (pc.nai_certified) {
    affiliations.push('NAI');
  }
  if (affiliations.length) {
    m.find('.pc_affiliations').text(affiliations.join(', '));
  } else {
    m.find('.pc_affiliations').html('<i>none</i>');
  }
  if (pc.network_description !== null) {
    m.find('.self_description').html('<i>❝ '+ pc.network_description +' ❞</i>');
  }
  m.find('.pc_domains').text(pc.tracking_domains);
  //-= Roll these up if possible, they are often the same URL, and let's be ricer about vertical space
  if (pc.privacy_policy_url !== null && pc.privacy_policy_url.replace(/www\./i, '') == pc.page_with_optout_url.replace(/www\./i, '')) {
	  m.find('.pc_privacy').text('Privacy Policy / Opt Out');
	  m.find('.pc_privacy_policy').html('<a href="'+ pc.privacy_policy_url +'" target="_pc">'+ pc.privacy_policy_url +'</a>');
	  m.find('.pc_opt,.pc_optout').hide();
  } else {
	  m.find('.pc_privacy').text('Privacy Policy');
	  m.find('.pc_opt,.pc_optout').show();
	  if (pc.privacy_policy_url !== null && pc.privacy_policy_url.length > 0) {
		  m.find('.pc_privacy_policy').html('<a href="'+ pc.privacy_policy_url +'" target="_pc">'+ pc.privacy_policy_url +'</a>');
	  } else {
		  m.find('.pc_privacy_policy').html('<i>none</i>');
	  }
	  if (pc.page_with_optout_url !== null && pc.page_with_optout_url.length > 0) {
		  m.find('.pc_optout').html('<a href="'+ pc.page_with_optout_url +'" target="_pc">'+ pc.page_with_optout_url +'</a>');
	  } else {
		  m.find('.pc_optout').html('<i>This company does not offer an opt out page.</i>');
	  }
  }
  if (pc.logo !== null && pc.logo.length > 0) {
	  m.find('.pc_logo').show().html('<img src="'+ pc.logo +'"/>');
  } else {
	  m.find('.pc_logo').html(pc.name);
  }
  if (pc.sharing_summary !== null && pc.sharing_summary.length > 0) {
	  m.find('.pc_sharing').text(pc.sharing_summary);
  } else {
	  m.find('.pc_sharing').html('<i>none</i>');
  }
  if (pc.merger_summary !== null && pc.merger_summary.length > 0) {
	  m.find('.pc_anonymity').text(pc.merger_summary);
  } else {
	  m.find('.pc_anonymity').html('<i>none</i>');
  }

  if (pc.sensitive_summary !== null && pc.sensitive_summary.length > 0) {
	  m.find('.pc_boundaries').text(pc.sensitive_summary);
  } else {
	  m.find('.pc_boundaries').html('<i>none</i>');
  }
  if (pc.keep_summary !== null && pc.keep_summary.length > 0) {
	  m.find('.pc_deletion').text(pc.keep_summary);
  } else {
	  m.find('.pc_deletion').html('<i>none</i>');
  }

});

$('a#close').live('click', function() {
  $('#lightbox').remove();
});
