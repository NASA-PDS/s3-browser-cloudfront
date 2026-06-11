/**
 * Site-specific bucket endpoint configuration for this deployment.
 *
 * Keep this file aligned with [README.md](../../README.md) (step 7 — editing `./src/js/bucketEndpoints.js`).
 */

/**
 * One bucket endpoint's connection between UI label, browse route prefix, and listing origin.
 *
 * @typedef {Object} BucketEndpointEntry
 * @property {string} URL - Base URL used for S3 ListBucket-style listing requests (CloudFront distribution
 *   origin or S3 REST endpoint). The app strips duplicate slashes; include scheme and host.
 * @property {string} [listingUrlPathPrefix] - For CloudFront path-style listings (`appendPathToUrl` not
 *   `false`): URL path matched by the distribution behavior (prefer trailing `/`). Omit or leave empty for
 *   direct virtual-hosted bucket access (`appendPathToUrl: false`); hash routes and `prefix` then use
 *   `deepLinkPath` only (see {@link getBucketEndpointBrowsePath}).
 * @property {string} [deepLinkPath] - Path segment(s) without repeating `listingUrlPathPrefix`. With path-style
 *   listing, sent as S3 `?prefix=` at browse root (under the behavior path). With `appendPathToUrl: false` and
 *   no `listingUrlPathPrefix`, this is the sole browse hash root and ListBucket prefix (direct bucket).

/**
 * Bucket endpoint catalog: each **key** is the label shown in the UI; each **value** is a {@link BucketEndpointEntry}.
 *
 * @type {Object.<string, BucketEndpointEntry>}
 */

function normalizeBucketEndpointPathComponent(p) {
    if (!p) return '';
    var s = String(p).replace(/^\/+/, '');
    if (!s.endsWith('/')) {
        s += '/';
    }
    return s;
}

/**
 * Full hash/browse path: optional listingUrlPathPrefix + optional deepLinkPath (base not repeated).
 * If `listingUrlPathPrefix` is omitted, browse root is `deepLinkPath` alone (direct bucket).
 *
 * @param {BucketEndpointEntry} bucketEndpoint
 * @returns {string}
 */
export function getBucketEndpointBrowsePath(bucketEndpoint) {
    if (!bucketEndpoint) return '';
    var base = normalizeBucketEndpointPathComponent(bucketEndpoint.listingUrlPathPrefix || '');
    var deepRaw = bucketEndpoint.deepLinkPath;
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

/**
 * Scheme and host for the page serving this app (no path). Use when a bucket endpoint's listing
 * origin is the same site or CloudFront distribution as the UI.
 *
 * @returns {string}
 */
export function getSiteOriginUrl() {
    return location.protocol + '//' + location.host;
}

export const bucketEndpoints = {
    "open-data-registry": {
        "URL": "https://pds-css-archive.s3.us-west-2.amazonaws.com",
        "deepLinkPath": "sbn/gbo.ast.catalina.survey/",
        "appendPathToUrl": false
    },
    "img": {
        "listingUrlPathPrefix": "data/store/img/",
        "deepLinkPath": "",
        "URL": getSiteOriginUrl()
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
