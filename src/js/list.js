import { sortables_init } from "./sort-table";
import { render } from "./autoindex";

import DOMPurify from 'isomorphic-dompurify';

var S3BL_IGNORE_PATH = false;
var BUCKET_URL = 'https://d1z62tir4fw0q0.cloudfront.net';

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
  var s3_rest_url = createS3QueryUrl(marker);
  
  // set loading notice
  $('#files').html('<div class="spinner-container"><img class="ajax-load-spinner" src="/index-style/images/explorer/ajaxload-circle.gif"/></div>');
  $.get(s3_rest_url).done(function(data) {
        // clear loading notice
        $('#files').html('');

        // var h2 = $('<h2>');
        // h2.html(renderLocation());
        // $('#files').append(h2);
    
        var xml = $(data);
        var info = getInfoFromS3Data(xml);
        if (table == null) {
            table = prepareTable(info);
        } else {
            var rows = appendRowstoTbody(info);
            var tbody = table.children('tbody');
            tbody.append(rows);
        }

        if (info.nextMarker != "null") {
            getS3Data(info.nextMarker, table);
        } else {
            $('#files').append(table);
            sortables_init();
        }

        render();
    }).fail(function(error) {
        console.error(error);
        $('#files').html('<strong>Error (Code ' + error.status + "): " + error.statusText + '</strong>');
    });
}

function createS3QueryUrl(marker) {
    var s3_rest_url = BUCKET_URL;
    s3_rest_url += '?delimiter=/';

    //
    // Handling paths and prefixes:
    //
    // 1. S3BL_IGNORE_PATH = false
    // Uses the pathname
    // {bucket}/{path} => prefix = {path}
    //
    // 2. S3BL_IGNORE_PATH = true
    // Uses ?prefix={prefix}
    //
    // Why both? Because we want classic directory style files in normal
    // buckets but also allow deploying to non-buckets
    //

    // const search = location.search;
    const search  = '';

    var rx = '.*[?&]prefix=' + S3B_ROOT_DIR + '([^&]+)(&.*)?$';
    var prefix = '';
    if (S3BL_IGNORE_PATH==false) {
        var prefix = location.pathname.replace(/^\//, S3B_ROOT_DIR);
    }

    var match = search.match(rx);
    if (match) {
        prefix = S3B_ROOT_DIR + match[1];
    } else {
        if (S3BL_IGNORE_PATH) {
            prefix = S3B_ROOT_DIR;
        }
    }
    if (prefix) {
        // make sure we end in /
        prefix = prefix.replace(/\/$/, '') + '/';
        s3_rest_url += '&prefix=' + encodeURIComponent(prefix);
    }
    
    if (marker) {
        s3_rest_url += '&marker=' + marker;
    }

    return s3_rest_url;
}

function getInfoFromS3Data(xml) {
    var files = $.map(xml.find('Contents'), function(item) {
        item = $(item);
        if (item.find('Key').text() != 'index.html' && item.find('Key').text() != 'list.js') {
            return {
                Key: item.find('Key').text(),
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
        var nextMarker = $(xml.find('NextMarker')[0]).text();
    } else {
        var nextMarker = null;
    }
  
    return {
        files: files,
        directories: directories,
        prefix: $(xml.find('Prefix')[0]).text(),
        nextMarker: encodeURIComponent(nextMarker)
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
                item.href = item.keyText;
            }
        } else {
            item.href = BUCKET_URL + '/' + encodeURIComponent(item.Key);
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
    if (prefix) {
        var up = prefix.replace(/\/$/, '').split('/').slice(0, -1).concat('').join('/'); // one directory up
        
        var parent = $(location).attr("href");

        const urlObj = new URL(parent);
        urlObj.search = ''; urlObj.hash = '';
        parent = urlObj.href;  

        if (parent.substr(parent.length - 1) == '/') {
            parent += "../";
        } else {
            parent += "/../";
        }

        var item = {
            Key: up,
            LastModified: '',
            Size: '',
            keyText: '../',
            href: S3BL_IGNORE_PATH ? '?prefix=' + up : parent
        };

    } else {
        var up = $(location).attr("href");

        const urlObj = new URL(up);
        urlObj.search = ''; urlObj.hash = '';
        up = urlObj.href;  

        if (up.substr(up.length - 1) == '/') {
            up += "../";
        } else {
            up += "/../";
        }

        var item = {
            Key: 'up',
            LastModified: '',
            Size: '',
            keyText: '/',
            href: up
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
                var href = $(location).attr("href");
                
                const urlObj = new URL(href);
                urlObj.search = ''; urlObj.hash = '';
                href = urlObj.href;  

                if (href.substr(href.length - 1) == '/') {
                    item.href = new URL(href + item.keyText).href;
                } else {
                    item.href = new URL(href + '/' + item.keyText).href;
                }
            }
        } else {
            item.href = BUCKET_URL + '/' + encodeURIComponent(item.Key);
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
    urlObj.hash = '';
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
    th_icon.html('<img src="/index-style/images/explorer/blank.gif" alt="" height="16" width="16">');
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
    urlObj.search = ''; urlObj.hash = '';
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