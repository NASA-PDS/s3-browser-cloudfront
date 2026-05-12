// Import our CSS
import '../scss/main.scss'

// Import JQuery. This will add the $ global variable 
import './jquery-import';

// Import all bootstrap plugins
import * as bootstrap from 'bootstrap';

// Or import only needed plugins
// import { Tooltip as Tooltip, Toast as Toast, Popover as Popover } from 'bootstrap';

// Or import just one
// import Alert as Alert from '../node_modules/bootstrap/js/dist/alert';

import './utils';
import './error';

import { bucketEndpoints } from './bucketEndpoints.js';
import getS3Data, { getAppBaseUrl, getCurrentPath, getMissionMatchForPath } from './list';

var SUBDIRS = [];
$.each( bucketEndpoints, function( key, value ) {
    SUBDIRS.push(value.Path);
});

// Redirect to index.html so the app is always served (S3/CloudFront without static hosting).
(function () {
    var pathname = location.pathname;
    var base = (process.env.PUBLIC_PATH || '/').replace(/\/$/, '');
    if (pathname === base || pathname === base + '/') {
        location.replace(getAppBaseUrl());
        return;
    }
    if (!pathname.endsWith('index.html') && pathname.indexOf(base) === 0) {
        var path = pathname.slice(pathname.indexOf(base) + base.length).replace(/^\/+/, '');
        if (path) {
            location.replace(getAppBaseUrl() + '#/' + path);
            return;
        }
    }
})();

// Show the <main>
$("main").show();

function isAtAppRoot() {
    var pathname = location.pathname;
    var base = (process.env.PUBLIC_PATH || '/').replace(/\/$/, '');
    var atConfiguredBase =
        pathname === base ||
        pathname === base + '/' ||
        pathname === base + '/index.html';
    // Local dev: page is often served at / or /index.html while PUBLIC_PATH still matches deploy (e.g. /s3app-an/).
    var atDevServerRoot = pathname === '/' || pathname === '/index.html';
    if (!atConfiguredBase && !atDevServerRoot) return false;
    var hash = (location.hash || '').replace(/^#\/?/, '');
    return !hash;
}

/**
 * Rebuild the initial bucket-list HTML inside #files, then populate it.
 * Necessary because getS3Data() replaces all of #files, so the .bucketlist
 * tbody no longer exists after navigating into a directory.
 */
function renderBucketList() {
    $('#files').html(
        '<div class="grid-col-4 padding-5">' +
        '<nav aria-label="Side navigation,">' +
        '<table class="table table-hover">' +
        '<tbody class="bucketlist"></tbody>' +
        '</table></nav></div>'
    );
    $.each( bucketEndpoints, function( key, value ) {
        var href = getAppBaseUrl() + '#/' + value.Path;
        $( ".bucketlist").append(
            "<tr class='even'><th scope='row'><div class='position-relative'>" +
            "<i class='fa-fw fas fa-folder' title='Directory' aria-hidden='true'></i>" +
            "<span class='visually-hidden'>(Directory)</span>" +
            "<a href='" + href + "' class='stretched-link'></a></div></th>" +
            "<td class='name'><div class='position-relative'>" +
            "<a href='" + href + "' class='stretched-link'>" + key + "</a></div></td></tr>"
        );
    });
}

function handleRoute() {
    if (isAtAppRoot()) {
        $('.breadcrumb').html('');
        renderBucketList();
    } else if (getMissionMatchForPath(getCurrentPath())) {
        $('.breadcrumb').html('');
        $('#files').html('');
        getS3Data();
    }
}

// Initial render on page load
$(function() {
    handleRoute();
});

// Re-render whenever the hash changes (same-page navigation — no full reload)
$(window).on('hashchange', function() {
    handleRoute();
});

