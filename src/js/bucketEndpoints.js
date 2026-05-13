/**
 * Site-specific mission configuration for this deployment.
 *
 * Keep this file aligned with [README.md](../../README.md) (step 7 — editing `./src/js/bucketEndpoints.js`).
 */

/**
 * One mission's connection between UI label, browse route prefix, and listing origin.
 *
 * @typedef {Object} MissionEntry
 * @property {string} URL - Base URL used for S3 ListBucket-style listing requests (CloudFront distribution
 *   origin or S3 REST endpoint). The app strips duplicate slashes; include scheme and host.
 * @property {string} listingUrlPathPrefix - URL path prefix for this dataset (CloudFront behavior path or
 *   path-style segment). Prefer a trailing `/`. Hash routes and prefix matching use the full browse path:
 *   `listingUrlPathPrefix` + optional `deepLinkPath` (see {@link getMissionBrowsePath}).
 * @property {string} [deepLinkPath] - Optional path under the base (no leading slash required); omit the
 *   `listingUrlPathPrefix` portion here so it is not repeated. Sent as S3 `prefix` at browse root when
 *   using path-style listing (`appendPathToUrl` not `false`).
 * @property {boolean} [appendPathToUrl=true] - If omitted or `true`, listing requests use `URL` + `/` +
 *   `listingUrlPathPrefix` in the path (typical CloudFront behavior URL). If `false`, listing URLs use
 *   `URL` only and the full browse path is supplied via the `prefix` query parameter (virtual-hosted S3).
 */

/**
 * Mission catalog: each **key** is the label shown in the UI; each **value** is a {@link MissionEntry}.
 *
 * @type {Object.<string, MissionEntry>}
 */

function normalizeMissionPathComponent(p) {
    if (!p) return '';
    var s = String(p).replace(/^\/+/, '');
    if (!s.endsWith('/')) {
        s += '/';
    }
    return s;
}

/**
 * Full hash/browse path for an entry: listingUrlPathPrefix + optional deepLinkPath (base not repeated).
 *
 * @param {MissionEntry} mission
 * @returns {string}
 */
export function getMissionBrowsePath(mission) {
    if (!mission) return '';
    var base = normalizeMissionPathComponent(mission.listingUrlPathPrefix || '');
    var deepRaw = mission.deepLinkPath;
    if (deepRaw == null || deepRaw === '') {
        return base;
    }
    var deep = String(deepRaw).replace(/^\/+/, '');
    if (!deep.endsWith('/')) {
        deep += '/';
    }
    if (!base) {
        return deep;
    }
    return base.replace(/\/$/, '') + '/' + deep;
}

export const bucketEndpoints = {
    "Catalina Sky Survey": {
        "listingUrlPathPrefix": "sbn/gbo.ast.catalina.survey/",
        "URL": "https://pds-css-archive.s3.us-west-2.amazonaws.com",
        "appendPathToUrl": false
    }
};

/**
 * File-prefix filters: values in this array are compared against listing results so matching entries can be
 * omitted from file rows in directory listings (see `README.md` — `exclude_prefixes`).
 *
 * @type {string[]}
 */
export const exclude_prefixes = [
    "mars_mro_ctx_globalmosaicv01_dickson_2023/", 
    "THEMIS/USA_NASA_PDS_ODTGEO_100XX/"
];
