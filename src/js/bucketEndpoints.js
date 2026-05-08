/**
 * Site-specific mission configuration for this deployment.
 *
 * Keep this file aligned with [README.md](../../README.md) (step 7 — editing `./src/js/missions.js`).
 */

/**
 * One mission's connection between UI label, browse route prefix, and listing origin.
 *
 * @typedef {Object} MissionEntry
 * @property {string} URL - Base URL used for S3 ListBucket-style listing requests (CloudFront distribution
 *   origin or S3 REST endpoint). The app strips duplicate slashes; include scheme and host.
 * @property {string} Path - Prefix for this dataset: must match how users navigate (hash route after `#/`,
 *   e.g. `peer-review-data/`) and must align with your CloudFront behavior path pattern or bucket layout.
 *   Prefer a trailing `/` so prefix matching in `list.js` behaves consistently.
 * @property {boolean} [appendPathToUrl=true] - If omitted or `true`, listing URLs are `URL` + `/` + `Path`
 *   (path-style behind CloudFront). If `false`, listing URLs use `URL` only and `Path` is supplied via the
 *   `prefix` query parameter (common for virtual-hosted S3 endpoints where the bucket is already in the host).
 */

/**
 * Mission catalog: each **key** is the label shown in the UI; each **value** is a {@link MissionEntry}.
 *
 * @type {Object.<string, MissionEntry>}
 */

export const bucketEndpoints = {
    "Catalina Sky Survey": {
        "Path": "sbn/gbo.ast.catalina.survey/",
        "URL": "https://pds-css-archive.s3.us-west-2.amazonaws.com",
        "appendPathToUrl": false
    }
};

/**
 * File-prefix filters: values in this array are compared against listing results so matching entries can be
 * omitted from the file list (see `README.md` — `exclude_prefixes`).
 *
 * @type {string[]}
 */
export const exclude_prefixes = [
    "mars_mro_ctx_globalmosaicv01_dickson_2023/", 
    "THEMIS/USA_NASA_PDS_ODTGEO_100XX/"
];
