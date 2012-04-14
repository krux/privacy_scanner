/* vim: set tabstop=4 expandtab: */

/* ATTENTION: This file is called by spider monkey on command line. It should contain NO
 * references to window, document, etc.
 */
var HarParser = {
    expected_parentid: false,
    // For political reasons, we want to be smart about what we are shown to be ushered in.
    // Here's a whitelist. Generated with:
    // mysql> select companies.pattern from data_providers left outer join companies on companies.name = data_providers.name;
    krux_collectors: [
        (/adadvisor\.net/), // aka targus
        (/\.revsci\.net|\.targetingmarketplace\.com/), // aka audience science
        (/(\.bizographics\.com|bizo\.com)/),
        (/\.bluekai\.com|\.bkrtx\.com|\.tracksimple\.com/),
        (/\.nexac\.com|\.nextaction\.net/), // aka datalogix
        (/\.exelator\.com/),
        (/cm\.g\.doubleclick\.net/), // Google User Matching
        (/\.ixiaa\.com/),
        (/\.mmismm\.com/), // Mindset media
        (/\.v12groupinc\.com/),
        (/visualdna\.com/),
        (/\.brilig\.com/), // not in the data providers table, but someone we work with through v12
        (/krxd\.net/) // us
    ]
};


/* By default, javascript passes by value, UNLESS you are passing a javascript
 * object, then it passes by reference. This function clones a new object.
 * Yes, I could have extended object prototype, but I hate it when people do that */
HarParser.clone = function (obj){
        if (typeof obj == "object" && obj !== null){
                var t = new obj.constructor();
                for(var key in obj) {
                        t[key] = HarParser.clone(obj[key]);
                }

                return t;
        } else {
                // Some other type (null, undefined, string, number)
                return obj;
        }
};


// Overwrite with the debugging for your use
HarParser.debug = function(msg, level){
    //print(msg);
};


/* For the supplied har file, iterate through and fill out what we know.
 * parentid
 * if expected_parentid, also populate the expected_parentid (useful for building test har files)
 */
HarParser.fillinHar = function(har) {
    var h = HarParser.clone(har);

    // If the first entry is a redirect, remove it.
    if (h.log.entries[0].response.status == 301 ||
        h.log.entries[0].response.status == 302) {
        h.log.entries.shift();
        h.first_page_was_redirect = true;
    }

    var originDomain = HarParser.get2ndLevelDomain(h.log.entries[0].request.url);

    // First fill in all the ids and the is_collector
    for (var i = 0; i < h.log.entries.length; i++){
        h.log.entries[i].id = i;
        h.log.entries[i].is_collector = HarParser.isCollectorRequest(h.log.entries[i], originDomain);
    }

    // Then fill in all the parent ids.
    for (var j = 0; j < h.log.entries.length; j++){
        var entry = h.log.entries[j];
        var p = HarParser.getUsherEntry(h.log.entries, entry, j);
        var pid;
        if (j === 0 ){
            pid = null;
        } else if (p === false ){
            pid = -1;
        } else {
            pid = p.id;
        }

        if (HarParser.expected_parentid){
            // fill in expected_parentid if guess_parent id is set
            entry.expected_parentid = entry.parentid;
            entry.explanation = "";
        } else {
            entry.parentid = pid;
        }
    }

    return h;
};


HarParser.getDomain = function(url){
    var domainMatch = url.match(/https*:\/\/([^:\/]+)/), domain;
    // Url or domain?
    if (domainMatch) {
        return domainMatch[1].toLowerCase();
    } else {
        return url.toLowerCase();
    }
};


/* For the supplied url or domain, pull out the 2nd level domain. Handles
 * funny stuff like .co.uk.
 */
HarParser.get2ndLevelDomain = function(urlOrDomain){
    var domain = HarParser.getDomain(urlOrDomain);

    // IP address. No, this isn't technically a 2nd level domain, but it's what we meant.
    if (domain.match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)){
        return domain;
    }

    // private dns names like localhost (no periods)
    if (domain.indexOf(".") === -1){
        return domain;
    }

    // .co.uk and .com.mx
    var sldMatchWankersAndBeaners = domain.match(/([\w\-]{1,249}\.com*\.[a-z]{2})$/);
    if (sldMatchWankersAndBeaners) {
        return sldMatchWankersAndBeaners[1];
    }

    // standard domains
    var sldMatch = domain.match(/([\w\-]{1,250}\.[a-z]{2,3})$/);
    if (sldMatch) {
        return sldMatch[1];
    }

    // Huh?
    return false;
};

/* Return the har entry for the supplied url from for har.
 * null if not found
 */
HarParser.getEntryFromUrl = function(har, url) {
    for (var i = 0; i < har.log.entries.length; i++){
        if (har.log.entries[i].request.url == url) {
            return har.log.entries[i];
        }
    }
    return null;
};


/* For the supplied headers, look for one that matches a specific name and return it's value */
HarParser.getHarHeader = function(headers, name) {
        for (var i = 0; i < headers.length; i++){
                if (headers[i].name == name) {
                        return headers[i].value;
                }
        }
        return false;
};


// The har file doesn't always have it...
HarParser.getResponseText = function(entry) {
    try {
        return entry.response.content.text || "";
    } catch (e) {
        return "";
    }
};

/* * The magic of our usher attribution algorithm.
 *
 * Usher. OMG. http://www.youtube.com/watch?v=1RnPB76mjxI
 *
 * Overall, it tries a bunch of different methods for determining the parent,
 * in descending order of confidence. Each method explained below.
 *
 * Ideas for improvement:
 * ) Loop optimization for CPU, as long as it doesn't come at the expense of readability
 *
 * If you change this, see the unit tests in har_processing directory
 */
HarParser.getUsherEntry = function(entries, entry, i){
    var usher_omg = HarParser._getUsherEntry(entries, entry, i);

    // Special handling for Krux. Essentially, we are not an usher, and it looks bad if we are.
    // See Vivek, Tom, Nick or Gullo for an explanation
    if (usher_omg && (/krxd.net/).test(usher_omg.request.url)) {
        // If the entry is a data provider, let it through
        var isKruxCollector = false, domain = HarParser.getDomain(entry.request.url);
        for (var i2 = 0; i2 < HarParser.krux_collectors.length; i2++) {
            if (HarParser.krux_collectors[i2].test(domain)){
                isKruxCollector = true;
                break;
            }
        }

        if (! isKruxCollector ) {
            // Not a data provider, set the usher to unknown
            HarParser.tagEntry(entry, null, 0, "Usher Unknown (X)");
            return false;
        }
    }
    return usher_omg;
};


HarParser._getUsherEntry = function(entries, entry, i){

    var collectorUrl = entry.request.url;
    var collectorDomain = HarParser.getDomain(collectorUrl);
    var collector2ndDomain = HarParser.get2ndLevelDomain(collectorUrl);
    var topPageUrl = entries[0].request.url;
    var topPageDomain = HarParser.getDomain(topPageUrl);
    var topPage2ndDomain = HarParser.get2ndLevelDomain(entries[0].request.url);
    var referrer = HarParser.getHarHeader(entry.request.headers, "Referer");

    /**** The code below is not optimized for CPU. It is optimized for readability. You're welcome. ****/

    // METHOD 1: Is it a redirect? This is the most reliable. We walk backwards through
    // the stack to make sure.
    for (var l = i-1; l >= 0; l-- ){
        var redirect = HarParser.getHarHeader(entries[l].response.headers, "Location");
        if (redirect){
            entries[l].is_redirect = true;
            if (redirect == collectorUrl){
                HarParser.tagEntry(entry, entries[l], 100, "Redirect");
                return entries[l];
            }
        }
    }

    // METHOD 2: If the referrer is a CSS file, we're good. Likely a css image.
    // I'm not positive that this behavior is true in all browsers,
    // but we're taking advantage of the fact that we are using Firefox.
    if (referrer && referrer != entries[0].request.url) {
        for (var l2 = i-1; l2 >= 0; l2--){
            if (entries[l2].request.url == referrer){
                if ( entries[l2].response.content.mimeType == "text/css"){
                    HarParser.tagEntry(entry, entries[l2], 100, "Referrer from CSS");
                    return entries[l2];
                } else {
                    // Referrer was not a css, try other methods.
                    break;
                }
            }
        }
    }


    // METHOD 3: Is the exact url in an entry? If so, use the last one.
    // Note this potential duplicates the url bits logic below, but it's here
    // because we want to explicitly use the last one if the code below
    // were to find the exact url in multiple places
    for (var l3 = i-1; l3 >= 0; l3--){
        var respText = HarParser.getResponseText(entries[l3]);
        if ( respText.indexOf(collectorUrl) > -1 ){
            HarParser.tagEntry(entry, entries[l3], 97, "Exact url found");
            return entries[l3];
        }
    }


    // Support function for the methods below that will walk through the passed in entries
    // looking for for ones that contain all of the urlPieceMatches (which is an array of strings)
    function findEntriesWithUrlPiece(entries, urlPieceMatches) {
        var matches = [], escapeRegExp = /[-[\]{}()*+?.,\\^$|#\s]/g;
        for (var i = 0, l = entries.length; i < l; i++ ) {
            var resp = HarParser.getResponseText(entries[i]), missing = false;
            for (var i2 = 0, l2 = urlPieceMatches.length; i2 < l2; i2++) {
                var index = resp.indexOf(urlPieceMatches[i2]);
                // Shortcut for performance. The regexp is expensive.
                if (index == -1) {
                    missing = true;
                    break;
                }

                // Escape any special characters
                // Check what the character immediately before is to see if its a word boundary.
                // Also allow for url encoded prefix, to catch: quantserve.com%2Fquant.js
                var match = new RegExp('([\\W"\'\\/]|%[A-Z0-9]{2})' + urlPieceMatches[i2].replace(escapeRegExp, "\\$&"));
                if (! match.test(resp)) {
                    missing = true;
                    break;
                }

            }
            if (!missing){
                matches.push(entries[i]);
            }
        }
        return matches;
    }


    // Support function that takes the possible entries found with a method below
    // and applies common logic to decide which one should be the parent
    // Return's either the parent entry or null if it can't determine
    // Don't like the name? Come up with a funnier one.
    function whoisYourDaddy(possibleDaddies, bastard, domainRollup) {
        var len = possibleDaddies.length;
        if (len === 0) {
            return null;
        } else if (len === 1) {
            // Well this is easy.
            return possibleDaddies[0];
        } else if ( domainRollup && len < 5 ) {
            // If all the possibilities are on the same second level domain, then we can assume
            // since it will map to the same company.
            var domains = [];
            for (var i = 0; i < len; i++) {
                domains.push(HarParser.get2ndLevelDomain(possibleDaddies[i].request.url));
            }
            if (HarParser.uniqueArray(domains).length === 1) {
                entry.attribution_details = "All possible entries have same second level domain - " + domains[0] + ".";
                return possibleDaddies[len-1];
            }
        }

        // Too many possible parents, we've got the makings of a Jerry Spring show here.
        return null;
    }

    // The pieces of the url that we will be looking for
    var urlMatches = HarParser.getUrlMatches(collectorUrl, topPageUrl);
    var urlMatchesLength = urlMatches.length;
    var daddy = null;

    // METHOD 4: Does the url piece (including domains) exist in only *one* previous entry?
    for (var i2 = 0; i2 < urlMatchesLength; i2++) {
        var matchingEntries = findEntriesWithUrlPiece(entries.slice(0, i), [urlMatches[i2]]);

        daddy = whoisYourDaddy(matchingEntries, entry, false);
        if (daddy) {
            HarParser.tagEntry(entry, daddy, 95, "Unique part of the url found", "Matched: " + urlMatches[i2]);
            return daddy;
        }
    }


    // METHOD 5: How about two pieces?
    // Note that I repeatedly tested/tried *three* unique pieces and found that it didn't make
    // a difference, and it's quite CPU intensive.
    for (i2 = 0; i2 < urlMatchesLength; i2++) {
        for (var i3 = i2+1; i3 < urlMatchesLength; i3++) {
            var matchingEntries2 = findEntriesWithUrlPiece(entries.slice(0, i), [urlMatches[i2], urlMatches[i3]]);
            daddy = whoisYourDaddy(matchingEntries2, entry, false);
            if (daddy) {
                HarParser.tagEntry(entry, daddy, 93, "Two unique parts of the url found", "Matched: " + urlMatches[i2] + '|' + urlMatches[i3]);
                return daddy;
            }
        }
    }

    // METHOD 6: Does a url piece (including domains) exist in only entries all from the same domain
    // (performs domain rollup)
    for (i2 = 0; i2 < urlMatchesLength; i2++) {
        var matchingEntries3 = findEntriesWithUrlPiece(entries.slice(0, i), [urlMatches[i2]]);

        daddy = whoisYourDaddy(matchingEntries3, entry, true);
        if (daddy) {
            HarParser.tagEntry(entry, daddy, 90, "Unique part of the url found in multiple entries, domain rollup", "Matched: " + urlMatches[i2]);
            return daddy;
        }
    }

    // METHOD 7: Does a url piece (including domains) have two matches and then thos two matches are parent/child?
    // Roll up parent/grandparent relationships
    for (i2 = 0; i2 < urlMatchesLength; i2++) {
        var matchingEntries4 = findEntriesWithUrlPiece(entries.slice(0, i), [urlMatches[i2]]);

        if (matchingEntries4.length === 2 && matchingEntries4[0].id === matchingEntries4[1].parentid){
            HarParser.tagEntry(entry, matchingEntries4[1], 90, "Unique part of the url found in two entries, parent/grandchild rollup", "Matched: " + urlMatches[i2]);
            return matchingEntries4[1];
        }
    }


    // If it has the same second level domain as the top level page...,
    // This is not perfectly correct in all cases as far as the specific entry, but it's fine to misattribute
    // it to the top level page instead of the specific stylesheet/javascript etc that brought it in.
    if (topPage2ndDomain == collector2ndDomain ) {
        // *.firstHost.com is attributable to the first entry
        HarParser.tagEntry(entry, entries[0], 35, "Same 2nd level domain as entry page");
        return entries[0];
    }

    // Unable to determine the usher
    HarParser.tagEntry(entry, null, 0, "Usher Unknown");
    return false;
};


/* For the supplied url, return a list of searchable strings to look for, from most specific to least.
    PERFORMANCE TODO: move the regexp's outside of this function so they are only compiled once
 */
HarParser.getUrlMatches = function(url, topPageUrl) {
    var topPage2ndDomain = HarParser.get2ndLevelDomain(topPageUrl);

    // strip protocal and hash off
    var cleanedUrl = url.replace(/^https*:\/\//, '').replace(/#.+/, '');

    // url and it's simple replaces
    var out = [ cleanedUrl ];

    if (url.indexOf('&') > -1) {
        out.push(cleanedUrl.replace(/\&/g, '\&amp;'));
    }
    if (url.indexOf('%20') > -1) {
        out.push(cleanedUrl.replace(/\%20/g, ' '));
    }

    var rootUri = cleanedUrl.replace(/[^\/]+/, '');
    out.push(rootUri);

    // If it's an offsite url, we can look for the domain as well.
    var collector2ndDomain = HarParser.get2ndLevelDomain(url);
    if (topPage2ndDomain != collector2ndDomain) {
        out.push(HarParser.getDomain(url));
    }

    // Split the url up into the chunks that make up a url, then sort the pieces by longest first.
    var pieces = rootUri.split(/[&\/?;=]/).sort(function(a, b) {
        return b.length - a.length;
    });
    for (var i = 0, l = pieces.length; i < l; i++){
        // Only search for strings that are longer than 5 characters. If it's less than that,
        // It won't likely be uniq... so skip.
        if (pieces[i].length < 5) {
            break;
        }

        // Exclude some noise.
        // ) No stuff that starts with http. It's probably a referring url.
        // ) No stuff that contains the page's domain
        // ) No spaces (often the page title, some other content.
        var piece = unescape(pieces[i]);
        if (piece.indexOf(" ") > -1 || piece.indexOf('http') === 0 || topPageUrl.indexOf(piece) > -1 ) {
            continue;
        }

        out.push(piece);
    }

    return HarParser.uniqueArray(out);
};

HarParser.getDomainPrefix = function(url) {
        return url.match(/https*:\/\/[^\/]+/)[0];
};

/* Pull the value of the Host header from a har request block */
HarParser.getHostFromHarEntry = function(entry){
        for (var i = 0; i < entry.request.headers.length; i++){
                if (entry.request.headers[i].name == "Host") {
                        return entry.request.headers[i].value;
                }
        }
        return "";
};

HarParser.isCollectorRequest = function(req, originDomain){
        // Offsite?
        if (HarParser.get2ndLevelDomain(req.request.url) == originDomain) {
                return false;
        }

        // Check if cookies are set.
        if (req.response.cookies.length === 0 && req.request.cookies.length === 0) {
                return false;
        }

        // TODO: More checks to widdle down the list. Over report for now.
        // Idea 1: Skip If future Expires header
        // Idea 2: Skip If max-age in Cache-Control header
        return true;
};

/* HAR (HTTP Archive) is a format that contains information about a web pages downloaded content.
 * http://groups.google.com/group/http-archive-specification/web/har-1-2-spec?hl=en
 * This function takes a har javascript object and parses it for data collectors,
 * and assigns the har_parent_index
 *
 * Pseudo logic:
 * 1) Find data collectors.
 *      Look through each net request.
 *        Is it offsite?
 *          Y) Did the request send a cookie?
 *            Y) Collector! - Figure out the usher
 *            N) Did the response set a cookie?
 *              Y) Collector - Figure out the usher
 *              N) Skip
 *          N) Skip
 *
 * ) Determining the usher is done with HarParser.getUsherEntry
 *
 * Output is an object that contains an array of collectors, with the usher and timing information.
 * {
 *      url
 *      responseTime
 *      content_type
 *      is_collector
 *      har_index
 *      har_parent_index
 * }
 */
HarParser.parseChainsFromHar = function(har) {
        // Get the originating page url
        try {
                var originUrl = har.log.entries[0].request.url;
        } catch(e) {
                HarParser.debug("parseChainsFromHar unable to determine the originating page. Invalid har object? " + e.message);
                return false;
        }
        // Origin domain (for offsite comparison)
        var originDomain = HarParser.get2ndLevelDomain(originUrl);
        HarParser.debug("originDomain for har = " + originDomain, 3);

        // Look through each net request
        // in order to dedupe the chains, we use the parentid + id as the key for out
        var out = {};
        for (var i = 1; i < har.log.entries.length; i++){

            var req = har.log.entries[i];

            if (req.is_collector) {
                out["|" + req.parentid + "|" + req.id] = HarParser.chainFromRequest(req);

                // Get all the parents
                var parentid = req.parentid, loop = 0;
                while (parentid > 0 && loop < 50 ) { // as long as parentid > 0, we have further to go
                    loop++; // I like belt & suspenders in while loops

                    var parent_request = har.log.entries[parentid];
                    var c = "|" + parent_request.parentid + "|" + parent_request.id;
                    out[c] = HarParser.chainFromRequest(parent_request);
                    parentid = parent_request.parentid;
                }
            }

        }

        // Python doesn't like to deal with a hash as an array, convert here
        var o = [];
        for (var k in out) { o.push(out[k]); }

        return o;
};


HarParser.chainFromRequest = function (req) {
    return {
        "url": req.request.url,
        "har_index": req.id,
        "har_parent_index": req.parentid,
        "response_time": req.time,
        "content_type": req.response.content.mimeType,
        "is_collector": req.is_collector
    };
};


/* For the supplied har file, produce a list of entries in tree form, with parent child
 * relationships represented
 */
HarParser.parseTreeFromHar = function(har) {
    try {
            var harEntries = HarParser.fillinHar(har).log.entries;
    } catch(e) {
            // Invalid har file?
            HarParser.debug("Error parsing har: "+  e.message);
            return false;
    }
    var pid;
    // Assign ushers as parent ids
    for (var i = 1 ; i < harEntries.length; i++){
        if (harEntries[i].parentid === -1){
            // Unable to determine the usher
            pid = 0;
            harEntries.unknown = true;
        } else {
            pid = harEntries[i].parentid;
        }

        if (! harEntries[pid].children ){
            harEntries[pid].children = [];
        }
        harEntries[pid].children.push(harEntries[i]);
    }

    // Return the first one, because it will have all the children (like a Mormon)
    return harEntries[0];
};

// Set the attribution properties for the supplied har entry
HarParser.tagEntry = function(entry, parentEntry, confidence, attributionMethod, attributionDetails) {
    entry.attribution_method = attributionMethod;
    if (entry.attribution_details) {
        entry.attribution_details += " " + attributionDetails;
    } else {
        entry.attribution_details = attributionDetails;
    }
    entry.confidence = confidence;
    entry.parentid = parentEntry ? parentEntry.id : -1;
};


HarParser.uniqueArray = function (a) {
    var holder = {};
    for (var i = 0, l = a.length; i<l; i++) {
        holder[a[i]] = true;
    }
    var out = [];
    for (var element in holder) {
        out.push(element);
    }
    return out;
};

