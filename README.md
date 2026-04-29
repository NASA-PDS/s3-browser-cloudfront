# PDS S3 Web Browser Using Cloudfront

## Full Original Instructions For MacOS

For one time setup instructions see [setup for macOS](./docs/setup-mac.md)

For everyday use see [work on macOS](./docs/work-mac.md)

## Prerequisites

### Node.js

Use the version in [`.nvmrc`](./.nvmrc). Install [Node.js](https://nodejs.org) directly, or use [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro) and run `nvm use` in the repo root.

## Getting started with making changes and deploying this codebase

1. Clone this repository and `cd` into it.
2. Install or select Node.js per [Prerequisites](#prerequisites) (for example `nvm use`).
3. Run `npm ci`.
4. Following PDS/SA practices, create buckets: one for the built app (upload `dist` here after the build) and one or more for data behind CloudFront origins.

    ### App Bucket

    1. Create a bucket that will store the built app (upload `dist` here after the build)
    2. Create CloudFront Origin Server that references the bucket in the previous step noting that:
        * Origin Access — Select "Legacy access identiies" and create an Origin Access Identity
        * Bucket Policy — "No, I will update the bucket policy"
        * Enable Origin Sheild — No
    3. Update the bucket policy for the bucket created in step 1, substituting `<CLOUDFRONT_DISTRIBUTION_ID>` and `<BUCKET_NAME>` with your CloudFront Distribution ID and bucket name respectively:

        ```
        {
            "Version": "2008-10-17",
            "Id": "PolicyForCloudFrontPrivateContent",
            "Statement": [
                {
                    "Sid": "1",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <CLOUDFRONT_DISTRIBUTION_ID>"
                    },
                    "Action": "s3:GetObject",
                    "Resource": "arn:aws:s3:::<BUCKET_NAME>/*"
                },
                {
                    "Sid": "2",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <CLOUDFRONT_DISTRIBUTION_ID>"
                    },
                    "Action": "s3:ListBucket",
                    "Resource": "arn:aws:s3:::<BUCKET_NAME>"
                }
            ]
        }
        ```

    4. Add a CloudFront behavior that uses the newly created origin server that references the bucket:
        * Path Pattern: Choose a name that will be used to access the app via CloudFront. For example, if we called the app "data-browser", the path pattern would be `data-browser/*`
        * Origin and origin groups: Select the bucket created in step 1
        * Compress objects automatically: Yes
        * Viewer protocol policy: "Redirect HTTP to HTTPS"
        * Allowed HTTP methods: "GET, HEAD"
        * Restrict viewer access: No
        * Cache key and origin requests: "Cache policy and origin request policy (recommended)"
        * Cache policy: CachingDisabled
        * Origin request policy - optional: CORS-S3Origin
        * Response Headers Policy: Create one and adjust as needed
        * Function Associations:
            * Viewer Request (Only if Cognito Authentication is needed, otherwise skip this setting):
                * Function Type: Lambda@Edge
                * Function ARN/Name: After you deploy the Cognito Lambda@Edge function (step 5), edit this behavior and set this to that function's ARN.

    ### Data Bucket

    1. Create or reuse a bucket that will store the data that the s3 browser will allow users to browse
    2. Create CloudFront Origin Server that references the bucket in the previous step noting that:
        * Origin Access — Select "Legacy access identiies" and create an Origin Access Identity
        * Bucket Policy — "No, I will update the bucket policy"
        * Enable Origin Sheild — No
    3. Update the bucket policy for the bucket created in step 1, substituting `<CLOUDFRONT_DISTRIBUTION_ID>` and `<BUCKET_NAME>` with your CloudFront Distribution ID and bucket name respectively:

        ```
        {
            "Version": "2008-10-17",
            "Id": "PolicyForCloudFrontPrivateContent",
            "Statement": [
                {
                    "Sid": "1",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <CLOUDFRONT_DISTRIBUTION_ID>"
                    },
                    "Action": "s3:GetObject",
                    "Resource": "arn:aws:s3:::<BUCKET_NAME>/*"
                },
                {
                    "Sid": "2",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <CLOUDFRONT_DISTRIBUTION_ID>"
                    },
                    "Action": "s3:ListBucket",
                    "Resource": "arn:aws:s3:::<BUCKET_NAME>"
                }
            ]
        }
        ```

    4. Add a CloudFront behavior that uses the newly created origin server that references the bucket:
        * Path Pattern: Choose a name that will be displayed in s3-browser. For example, if we called the data folder "peer-review-data", the path pattern would be `peer-review-data/*`
        * Origin and origin groups: Select the bucket created in step 1
        * Compress objects automatically: Yes
        * Viewer protocol policy: "Redirect HTTP to HTTPS"
        * Allowed HTTP methods: "GET, HEAD"
        * Restrict viewer access: No
        * Cache key and origin requests: "Cache policy and origin request policy (recommended)"
        * Cache policy: CachingDisabled
        * Origin request policy - optional: S3-Forward-Query-Strings-Only
        * Response Headers Policy: Create one and adjust as needed
        * Function Associations:
            * Viewer Request (Only if Cognito Authentication is needed, otherwise skip this setting):
                * Function Type: Lambda@Edge
                * Function ARN/Name: After you deploy the Cognito Lambda@Edge function (step 5), edit this behavior and set this to that function's ARN.

    Confirm app and data behaviors (cache policy, origin request policy, optional viewer-request Lambda) match what you need before wiring Cognito in the next step.

5. **If authentication is required**:
  * **Cognito**: User pool and app client; callback/sign-out URLs on CloudFront (e.g. `…/{app-behavior}/index.html` and the data behavior URL); strong passwords; **Managed Login** or hosted UI.
  * **Lambda@Edge**: Cognito handler in **us-east-1** (for example `cognito-edge-handler`); pool/client IDs and `parseAuthPaths` (or equivalent) aligned with behaviors; secrets only in deployment.
  * **S3**: OAI/OAC grants **s3:GetObject** (and **s3:ListBucket** on the data bucket where listing applies); **block all public access** on app and data buckets.
6. In `webpack.config.js`, find `new webpack.EnvironmentPlugin` and set `PUBLIC_PATH` to the path where the app will be hosted (default `/data/`).
7. Edit `./src/js/missions.js`:
  * **`missions`**: Each object key is the mission label in the UI. Each value needs `URL` (CloudFront base, e.g. `https://d1234567890abc.cloudfront.net`) and `Path` (data behavior URL prefix, usually with a trailing `/`, matching CloudFront).
  * **`exclude_prefixes`**: Prefixes to omit from directory listings.
8. Run `npm run build` and upload `dist/` to the app bucket.

**Note**: Prefer `npm ci` for installs from a locked tree. Use `npm install` only when you intend to change dependency versions in `package.json`.