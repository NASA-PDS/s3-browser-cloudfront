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

// Show the <main>
$("main").show();

import getS3Data from './list';
$(function() {
    getS3Data();
});

