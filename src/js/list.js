import { sortables_init } from "./sort-table";
import { render } from "./autoindex";

import DOMPurify from 'isomorphic-dompurify';

import {missions, exclude_prefixes} from './missions.js';

var S3BL_IGNORE_PATH = false;

var SUBDIRS = [];
$.each( missions, function( key, value ) {
    SUBDIRS.push(value.Path);
});

/**
 * Base URL that always serves the app (S3/CloudFront without static hosting requires index.html in path).
 */
export function getAppBaseUrl() {
    const origin = location.protocol + '//' + location.hostname;
    const basePath = (process.env.PUBLIC_PATH || '/').replace(/\/$/, '');
    return origin + basePath + '/index.html';
}

/**
 * Current browse path (used for S3 prefix and for building links).
 * When the app is served from index.html, path is taken from the hash (#/peer-review-data/sub/).
 * Otherwise uses pathname for backward compatibility.
 */
export function getCurrentPath() {
    const pathname = location.pathname;
    const publicPathNorm = (process.env.PUBLIC_PATH || '/').replace(/^\//, '').replace(/\/$/, '');
    if (pathname.endsWith('index.html')) {
        const hashPath = (location.hash || '').replace(/^#\/?/, '');
        return hashPath; // may be '' or 'peer-review-data/subfolder/'
    }
    // Legacy: pathname-based (e.g. /peer-review-app/peer-review-data/sub/)
    let p = pathname.replace(/^\/+/, '');
    if (publicPathNorm && p.indexOf(publicPathNorm) === 0) {
        p = p.slice(publicPathNorm.length).replace(/^\/+/, '');
    }
    return p;
}

var BUCKET_URL = '';

/**
 * (Re-)determine the bucket URL for the current browse path.
 * Called at module load and again at the start of each top-level getS3Data() call
 * so that hash-based navigation (no full page reload) always uses the right bucket.
 */
function resolveBucketUrl() {
    var url = '';
    $.each(missions, function(key, value) {
        if (getCurrentPath().includes(value.Path) || location.pathname.includes(value.Path)) {
            // Include the mission path as a URL path segment so that S3 keys
            // returned by the API are relative to this base
            // (e.g. "A/PIA24937.jpg" rather than "peer-review-data/A/PIA24937.jpg").
            url = value.URL.replace(/\/$/, '') + '/' + value.Path.replace(/\/$/, '');
        }
    });
    BUCKET_URL = url;
}
resolveBucketUrl();


if (typeof S3BL_IGNORE_PATH == 'undefined' || S3BL_IGNORE_PATH!=true) {
    var S3BL_IGNORE_PATH = false;
}

if (typeof BUCKET_URL == 'undefined') {
    var BUCKET_URL = new URL(location.protocol + '//' + location.hostname).href;
}

if (typeof BUCKET_NAME != 'undefined') {
    // if bucket_url does not start with bucket_name,
    // assume path-style url
    if (!~BUCKET_URL.indexOf(location.protocol + '//' + BUCKET_NAME)) {
        BUCKET_URL += '/' + BUCKET_NAME;
    }
}

if (typeof S3B_ROOT_DIR == 'undefined') {
    var S3B_ROOT_DIR = '';
}

function getS3Data(marker, table) {
  // Re-resolve bucket URL on every fresh call so hash navigation always works.
  if (!marker) {
    resolveBucketUrl();
  }
  var s3_rest_url = createS3QueryUrl(marker);
  
  // set loading notice
  $('#files').html('<div class="spinner-container"><img class="ajax-load-spinner" src="' + process.env.PUBLIC_PATH + 'index-style/images/explorer/ajaxload-circle.gif"/></div>');
  $.get(s3_rest_url).done(function(data) {
        // clear loading notice
        $('#files').html('');

        // var h2 = $('<h2>');
        // h2.html(renderLocation());
        // $('#files').append(h2);
    
        var xml = $(data);
               var info = getInfoFromS3Data(xml);
        if (info.directories.length > 0 || info.files.length > 0) {
            if (table == null) {
                table = prepareTable(info);
            } else {
                var rows = appendRowstoTbody(info);
                var tbody = table.children('tbody');
                tbody.append(rows);
            }
            if (info.nextMarker) {
                getS3Data(info.nextMarker, table);
            } else {
                $('#files').append(table);
                sortables_init();
                render(SUBDIRS);
            } 
        }


        else {
            $('#files').append(table);
            sortables_init();
        }

    }).fail(function(error) {
        console.error(error);
        $('#files').html('<strong>Error (Code ' + error.status + "): " + error.statusText + '</strong>');
    });
}

function createS3QueryUrl(marker) {
    // BUCKET_URL already contains the mission path (e.g. https://cdn.example.com/peer-review-data).
    // Strip that mission path from getCurrentPath() to get only the sub-path
    // relative to the mission base, which is what S3 expects as the ?prefix= value.
    // e.g. getCurrentPath() = "peer-review-data/"    → prefix = ""  → .../peer-review-data/?delimiter=/
    //      getCurrentPath() = "peer-review-data/A/"  → prefix = "A/" → .../peer-review-data/?delimiter=/&prefix=A/
    var s3_rest_url = BUCKET_URL.replace(/\/$/, '') + '/?delimiter=/';

    var currentPath = getCurrentPath();
    if (currentPath && !currentPath.endsWith('/')) currentPath += '/';

    var relativePrefix = currentPath;
    $.each(missions, function(key, value) {
        if (currentPath.indexOf(value.Path) === 0) {
            relativePrefix = currentPath.slice(value.Path.length);
        }
    });

    if (relativePrefix) {
        relativePrefix = relativePrefix.replace(/\/$/, '') + '/';
        s3_rest_url += '&prefix=' + relativePrefix;
    }

    if (marker) {
        s3_rest_url += '&marker=' + marker;
    }

    return s3_rest_url;
}

function getInfoFromS3Data(xml) {
    // The top-level <Prefix> is the query prefix S3 echoes back (e.g. "A/").
    // S3 includes a zero-byte placeholder object whose Key equals that prefix —
    // skip only that exact entry so deeper placeholders are unaffected.
    var queryPrefix = $(xml.find('Prefix')[0]).text();

    var files = $.map(xml.find('Contents'), function(item) {
        item = $(item);
        var key = item.find('Key').text();
        if (key === queryPrefix) { return; }
        if (!exclude_prefixes.includes(item.find('Prefix').text())) {
            return {
                Key: key,
                LastModified: item.find('LastModified').text(),
                Size: item.find('Size').text(),
                Type: 'file'
            }
        }
    });
  
    var directories = $.map(xml.find('CommonPrefixes'), function(item) {
        item = $(item);

        if (item.find('Prefix').text() != 'index-style/') {
            return {
                Key: item.find('Prefix').text(),
                LastModified: '',
                Size: '',
                Type: 'directory'
            }
        }
    });

    if ($(xml.find('IsTruncated')[0]).text() == 'true') {
        var nm = $(xml.find('NextMarker')[0]).text();
        var nextMarker = nm || null;
    } else {
        var nextMarker = null;
    }
  
    return {
        files: files,
        directories: directories,
        prefix: $(xml.find('Prefix')[0]).text(),
        nextMarker: nextMarker
    }
}

function appendRowstoTbody(info) {
    var rows = [];
    var files = info.directories.concat(info.files), prefix = info.prefix;
    var blankTr = $('<tr/>');

    jQuery.each(files, function(idx, item) {
        // strip off the prefix
        item.keyText = item.Key.substring(prefix.length);
        if (item.Type === 'directory') {
            if (S3BL_IGNORE_PATH) {
                item.href = new URL(location.protocol + '//' + location.hostname + location.pathname + '?prefix=' + item.Key).href;
            } else {
                var currentPath = getCurrentPath();
                if (!currentPath.endsWith('/')) currentPath += '/';
                var pathForLink = currentPath + item.keyText;
                item.href = getAppBaseUrl() + '#/' + pathForLink;
            }
        } else {
            item.href = BUCKET_URL + '/' + item.Key;
            item.href = item.href.replace(/%2F/g, '/');
        }

        var tr = $("<tr>");
        
        var records = renderRow(item);
        for (var i = 0; i < records.length; i++) {
            tr.append(records[i]);
        }

        rows.push(tr);
        rows.push(blankTr);
    });

  return rows;
}

// info is object like:
// {
//    files: ..
//    directories: ..
//    prefix: ...
// } 
function prepareTable(info) {
    var files = info.directories.concat(info.files), prefix = info.prefix;
    var table = $("<table>", {id : 's3table', 'class' : 'sortable'});
    var tbody = $("<tbody>");

    // add the ../ at the start of the directory files
    var currentPathFull = getCurrentPath();
    if (prefix) {
        var up = prefix.replace(/\/$/, '').split('/').slice(0, -1).concat('').join('/'); // one directory up (stripped)

        var parentPath = currentPathFull.replace(/\/$/, '').split('/').slice(0, -1).join('/');
        if (parentPath) parentPath += '/';
        var parentHref = S3BL_IGNORE_PATH ? '?prefix=' + up : getAppBaseUrl() + '#/' + parentPath;
        var item = {
            Key: up,
            LastModified: '',
            Size: '',
            keyText: '../',
            href: parentHref
        };

    } else {
        var item = {
            Key: 'up',
            LastModified: '',
            Size: '',
            keyText: '/',
            href: getAppBaseUrl() + (location.pathname.endsWith('index.html') ? '#/' : '')
        };
    }

    var parentUrl = item.href;
    var blankTr = $('<tr/>');
    
    var headers = renderTableHeader();
    var tr_headers = $("<tr>");
    for (var i = 0; i < headers.length; i++) {
        tr_headers.append(headers[i]); 	  
    }
    tbody.append(tr_headers);
    tbody.append(blankTr);
  
    var parentRecords = renderParentDirRecord(parentUrl);
    var tr_parent = $("<tr>", {'class' : 'sorttop'});
    for (var i = 0; i < parentRecords.length; i++) {
        tr_parent.append(parentRecords[i]); 	  
    }
    tbody.append(tr_parent);
  
    jQuery.each(files, function(idx, item) {
        // strip off the prefix
        item.keyText = item.Key.substring(prefix.length);
        if (item.Type === 'directory') {
            if (S3BL_IGNORE_PATH) {
                item.href = new URL(location.protocol + '//' + location.hostname + location.pathname + '?prefix=' + item.Key).href;
            } else {
                var currentPath = getCurrentPath();
                if (!currentPath.endsWith('/')) currentPath += '/';
                var pathForLink = currentPath + item.keyText;
                item.href = getAppBaseUrl() + '#/' + pathForLink;
            }
        } else {
            item.href = BUCKET_URL + '/' + item.Key;
            item.href = item.href.replace(/%2F/g, '/');
        }

        var tr = $("<tr>");
        var records = renderRow(item);
        for (var i = 0; i < records.length; i++) {
            tr.append(records[i]);
        }

        tbody.append(tr);
        tbody.append(blankTr);
    });

    table.append(tbody);
    return table;
}


function renderParentDirRecord(parentUrl) {
    var records = [];

    const urlObj = new URL(parentUrl);
    urlObj.search = '';
    parentUrl = urlObj.href;
    
    var td_icon = $("<td>", {'class' : 'name', 'valign' : 'top'});
    var clean = DOMPurify.sanitize('<a href="' + parentUrl + '"><img src="" alt="[back]" height="16" width="16"></a>');
    td_icon.html(clean);
    records.push(td_icon);
    
    var td_parent = $("<td>", {'class' : 'name'});
    clean = DOMPurify.sanitize('<a href="' + parentUrl + '">Parent Directory</a>');
    td_parent.html(clean);
    records.push(td_parent);
    
    var td_blank = $("<td>");
    td_blank.html('-');
    records.push(td_blank);
    
    var td_dash = $("<td>", {'align' : 'right'});
    td_dash.html('-');
    records.push(td_dash);
    
    return records;
}

function renderTableHeader() {
    var headers = [];

    var th_icon = $("<th>", {'class' : 'icon unsortable'});
    th_icon.html('<img src="' + process.env.PUBLIC_PATH + 'index-style/images/explorer/blank.gif" alt="" height="16" width="16">');
    headers.push(th_icon);

    var th_name = $("<th>", {'class' : 'name'});
    th_name.html('Name');
    headers.push(th_name);

    var th_modified = $("<th>", {'class' : 'date'});
    th_modified.html('Last Modified&nbsp;&nbsp;');
    headers.push(th_modified);

    var th_size = $("<th>", {'class' : 'size'});
    th_size.html('Size&nbsp;&nbsp;');
    headers.push(th_size);

    return headers;
}

function renderRow(item) {
    var records = [];
    var alt = '[text]';
    var src = 'data:,';
    if (item.Type == "directory") {
        alt = '[directory]';
        src = 'data:,';
    }

    const urlObj = new URL(item.href);
    urlObj.search = '';
    const item_href = urlObj.href;      

    var td_icon = $("<td>", {'class' : 'name', 'valign' : 'top'});
    var clean = DOMPurify.sanitize('<a href="' + item_href + '"><img src="' + src + '" alt="' + alt + '" height="16" width="16"</a>');
    td_icon.html(clean);
    records.push(td_icon);

    var td_file = $("<td>", {'class' : 'name'});
    clean = DOMPurify.sanitize('<a href="' + item_href + '">' + item.keyText + '</a>');
    td_file.html(clean);
    records.push(td_file);

    var td_modified = $("<td>", {'align' : 'right'});
    if (item.Type == "directory") {
        td_modified.html('-');
    } else {
        td_modified.html(item.LastModified);
    }
    records.push(td_modified);

    var td_size = $("<td>", {'align': 'right'});
    if (item.Type == "directory") {
        td_size.html('-');
    } else {
        td_size.html(item.Size);
    }
    records.push(td_size);

    return records;
}

function padRight(padString, length) {
    var str = padString.slice(0, length-3);
    if (padString.length > str.length) {
        str += '...';
    }

    while (str.length < length) {
        str = str + ' ';
    }

    return str;
}

export default getS3Data;