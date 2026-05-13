# PDS S3 Web Browser Using Cloudfront

## Full Original Instructions For MacOS

For one time setup instructions see [setup for macOS](./docs/setup-mac.md)

For everyday use see [work on macOS](./docs/work-mac.md)

## Prerequisites

### Node.js

Use the version in [`.nvmrc`](./.nvmrc). Install [Node.js](https://nodejs.org) directly, or use [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro) and run `nvm use` in the repo root.

## Getting started with making changes and deploying this codebase

1. Clone this repository and `cd` into it.
2. Install or select Node.js per [Prerequisites](#prerequisites).
3. Run `nvm use` to switch to the latest compatible version of node.
4. Run `npm ci`. If package.json is missing run `npm install` instead. The ci command needs a package.json to work.
5. Following PDS/SA practices, create buckets: one for the built app (upload `dist` here after the build) and one or more for data behind CloudFront origins.

### App Bucket

1. Create a bucket that will store the built app (upload `dist` here after the build).
2. Create CloudFront Origin Server that references the bucket in the previous step noting that:
    * Origin Access — Select "Origin access control settings (recommended)"
    * Create (or reuse) an "Origin access control" that matches the settings below and reference it:
        * Name: Name this OAC appropriately
        * Description: Describe this OAC appropriately
        * Signing Behavior: "Sign requests (recommended)" (Is labeled as "Always sign requests" when viewing an existing OAC)
        * Origin Type: "S3"
    * Bucket Policy — "No, I will update the bucket policy"
    * Enable Origin Sheild — No
3. Update the bucket policy for the bucket created in step 1, substituting `<CLOUDFRONT_DISTRIBUTION_ARN>` and `<APP_BUCKET_NAME>` with your CloudFront Distribution ARN and S3 Browser App bucket name respectively:

    ```
    {
        "Version": "2008-10-17",
        "Id": "PolicyForCloudFrontPrivateContent",
        "Statement": [
            {
                "Sid": "1",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::<APP_BUCKET_NAME>/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": "<CLOUDFRONT_DISTRIBUTION_ARN>"
                    }
                }
            }
        ]
    }
    ```

4. Add a CloudFront behavior that uses the newly created origin server that references the bucket:
    * Path Pattern: Choose a name that will be used to access the app via CloudFront. For example, if we want the path the user uses to access the app to be "data-browser", the path pattern would be `/data-browser*`
    * Origin and origin groups: Select the bucket created in step 1
    * Compress objects automatically: Yes
    * Viewer protocol policy: "HTTPS Only"
    * Allowed HTTP methods: "GET, HEAD, OPTIONS"
    * Restrict viewer access: No
    * Cache key and origin requests: "Cache policy and origin request policy (recommended)"
    * Cache policy: CachingDisabled
    * Origin request policy: "AllViewerExceptHostHeader"
    * Response Headers Policy: "SimpleCORS"
    * Create a CloudFront Function and assign it to the "viewer request" function association. The function should rewrite paths so that the user is redirected to the app's `index.html` file that is uploaded to the bucket. Note the `<PATH_PATTERN>` used in the function that needs to be updated to match the path pattern you chose in step 1, the trailing `/` is needed here:

        Development Runtime: cloudfront-js-2.0

        ```
        function handler(event) {
            
            var request = event.request;

            request.uri = request.uri.replace(/^\/<PATH_PATTERN>/, '') || '/';
            
            if (request.uri.endsWith('/')) {
                request.uri += 'index.html'
            }
            
            return request;
        }
        ```

### Data Bucket

1. Create or reuse a bucket that will store the data that the s3 browser will allow users to browse. This bucket can be in the EN venue account or in a Node's Venue account.
2. Create CloudFront Origin Server that references the bucket in the previous step noting that:
    * **Note:**: if referencing a bucket that is in _another_ AWS account, be sure to use the fully qualified domain URL in the `origin domain` field.
    * Origin Access — Select "Origin access control settings (recommended)"
    * Create (or reuse) an "Origin access control" that matches the settings below and reference it:
        * Name: Name this OAC appropriately
        * Description: Describe this OAC appropriately
        * Signing Behavior: "Sign requests (recommended)" (Is labeled as "Always sign requests" when viewing an existing OAC)
        * Origin Type: "S3"
    * Bucket Policy — "No, I will update the bucket policy"
    * Enable Origin Sheild — No
3. Update the bucket policy for the bucket created in step 1, substituting `<CLOUDFRONT_DISTRIBUTION_ARN>` and `<DATA_BUCKET_NAME>` with your CloudFront Distribution ID and bucket name respectively:

    **Note:** If thie bucket is in a separate account, the CloudFront ARN still needs to reference the EN CloudFront distribution that will be accessing it.

    ```
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowCloudFrontGetObject",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::<DATA_BUCKET_NAME>/*",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": "<CLOUDFRONT_DISTRIBUTION_ARN>"
                    }
                }
            },
            {
                "Sid": "AllowCloudFrontListBucket",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudfront.amazonaws.com"
                },
                "Action": "s3:ListBucket",
                "Resource": "arn:aws:s3:::<DATA_BUCKET_NAME>",
                "Condition": {
                    "StringEquals": {
                        "AWS:SourceArn": "<CLOUDFRONT_DISTRIBUTION_ARN>"
                    }
                }
            }
        ]
    }
    ```

4. Add a CloudFront behavior that uses the newly created origin server that references the bucket:
    * Path Pattern: Choose a name that will be displayed in s3-browser. For example, if we called the data folder "peer-review-data", the path pattern would be `peer-review-data/*`
    * Origin and origin groups: Select the bucket created in step 1
    * Compress objects automatically: Yes
    * Viewer protocol policy: "HTTPS only"
    * Allowed HTTP methods: "GET, HEAD, OPTIONS"
    * Restrict viewer access: No
    * Cache key and origin requests: "Cache policy and origin request policy (recommended)"
    * Cache policy: CachingDisabled
    * Origin request policy: "AllViewerExceptHostHeader"
    * Response Headers Policy: "SimpleCORS"
    * Create a CloudFront Function and assign it to the "viewer request" function association. The function should rewrite paths to the data in the bucket. Note the `<PATH_PATTERN>` used in the function that needs to be updated to match the path pattern you chose in step 1, the trailing `/` is needed here:

        Development Runtime: cloudfront-js-2.0

        ```
        function handler(event) {
            var request = event.request;

            if (request.method === 'OPTIONS') {
                return {
                    statusCode: 204,
                    statusDescription: 'No Content',
                    headers: {
                        'access-control-allow-origin': { value: '*' },
                        'access-control-allow-methods': { value: 'GET, HEAD, OPTIONS' },
                        'access-control-allow-headers': { value: '*' },
                        'access-control-max-age': { value: '86400' }
                    }
                };
            }

            request.uri = request.uri.replace(/^\/<PATH_PATTERN>/, '') || '/';
            return request;
        }
        ```

5. In `webpack.config.js`, find `new webpack.EnvironmentPlugin` and set `PUBLIC_PATH` to the path where the app will be hosted (default `/data/`).
6. Edit `./src/js/bucketEndpoints.js`:
  * **`bucketEndpoints`**: Each object key is the bucket label in the UI (bucket list and links). Each value needs **`URL`** (origin base for listing requests—typically your CloudFront hostname, e.g. `https://d1234567890abc.cloudfront.net`, or an S3 REST endpoint) and **`listingUrlPathPrefix`** (the path segment used in listing URLs and at the start of hash routes; prefer a trailing `/`, consistent with CloudFront behavior paths).
  * **`deepLinkPath`** (optional): Additional path under that base for the default browse root and deep links—omit the `listingUrlPathPrefix` portion here so it is not repeated. With path-style listing (`appendPathToUrl` not `false`), this is sent as the S3 `prefix` at the mission root; hashes still use the combined path from `getMissionBrowsePath` in the same file.
  * **`appendPathToUrl`** (optional on each bucketEndpoint): Defaults to `true`. When `true`, the app requests listings at `URL` with `listingUrlPathPrefix` appended as URL path segments (typical CloudFront behavior URL). When `false`, the app uses `URL` as-is and sends the full browse path (`listingUrlPathPrefix` + optional `deepLinkPath`, and subfolders) via the `prefix` query parameter instead—useful for virtual-hosted–style S3 URLs where the bucket hostname is already in `URL`.
  * **`exclude_prefixes`**: Prefix strings to omit from file rows in directory listings (see `bucketEndpoints.js` for the export used by the listing code).
7. Run `npm run build` and upload `dist/` to the app bucket.

**Note**: Prefer `npm ci` for installs from a locked tree. Use `npm install` only when you intend to change dependency versions in `package.json`.

### Local Development

1. Clone this repository and `cd` into it.
2. Run `nvm use`.
3. Run `npm ci` or `npm install` if the package.json file is missing.
4. Edit dev server port in webpack.config.js to an available port on your localhost. Under plugins -> devServer -> `port: 9002`.
5. Run `npm run start`.
6. Open a browser and go to `localhost:9002` or `localhost:<port>`.

