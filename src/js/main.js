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

import { missions } from './missions.js';

// Show the <main>
$("main").show();

if (location.pathname == process.env.PUBLIC_PATH){
    $.each( missions, function( key, value ) {
        var items = [];
        $( ".bucketlist").append("<tr class='even'> <th scope='row'><div class='position-relative'><i class='fa-fw fas fa-folder' title='Directory' aria-hidden='true'></i><span class='sr-only'>(Directory)</span><a href='" + process.env.PUBLIC_PATH + value.Path + "' class='stretched-link'></a></div></th><td class='name'> <div class='position-relative'> <a href='" + process.env.PUBLIC_PATH + value.Path + "' class='stretched-link'>" + key + "</a></div></td></tr>" );
        });
}


var SUBDIRS = [];
$.each( missions, function( key, value ) {
    SUBDIRS.push(value.Path);
});


import getS3Data from './list';
$(function() {
    if (SUBDIRS.some(w => location.pathname.includes(w))) {
        getS3Data();
    }
});

