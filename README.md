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
4. In `webpack.config.js`, find `new webpack.EnvironmentPlugin` and set `PUBLIC_PATH` to the path where the app will be hosted (default `/data/`).
5. Edit `./src/js/missions.js`:
  * **`missions`**: Each object key is the mission label in the UI. Each value needs `URL` (CloudFront base, e.g. `https://d1234567890abc.cloudfront.net`) and `Path` (data behavior URL prefix, usually with a trailing `/`, matching CloudFront).
  * **`exclude_prefixes`**: Prefixes to omit from directory listings.
6. Following PDS/SA practices, create buckets: one for the built app (upload `dist` here after the build) and one or more for data behind CloudFront origins.
7. **CloudFront** (one behavior for the app bucket, one for the data bucket):
  * **CachingDisabled** on both.
  * **Data** behavior: origin request policy forwards **query strings** to S3 only; **Lambda@Edge** on **viewer request** if you use edge auth (e.g. `cognito-edge-handler`).
  * **App** behavior: e.g. **CORS-S3Origin**; same viewer-request Lambda if Cognito also protects the app.
8. **If authentication is required**:
  * **Cognito**: User pool and app client; callback/sign-out URLs on CloudFront (e.g. `…/{app-behavior}/index.html` and the data behavior URL); strong passwords; **Managed Login** or hosted UI.
  * **Lambda@Edge**: Cognito handler in **us-east-1**; pool/client IDs and `parseAuthPaths` (or equivalent) aligned with behaviors; secrets only in deployment.
  * **S3**: OAI/OAC grants **s3:GetObject** (and **s3:ListBucket** on the data bucket where listing applies); **block all public access** on app and data buckets.
9. Run `npm run build` and upload `dist/` to the app bucket.

**Note**: Prefer `npm ci` for installs from a locked tree. Use `npm install` only when you intend to change dependency versions in `package.json`.