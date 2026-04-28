# PDS S3 Web Browser Using Cloudfront

## Full Original Instructions For MacOS

For one time setup instructions see [setup for macOS](./docs/setup-mac.md)

For everyday use see [work on macOS](./docs/work-mac.md)

## Deployment Short Version

1. Clone this repository.
2. Run `nvm` (go to https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro to install nvm)
3. Run `npm ci` (go to https://nodejs.org/en to install nodejs)
4. Open `webpack.config.js` Search for `new webpack.EnvironmentPlugin` and change the value for `PUBLIC_PATH` to the desired path the application will be deployed to. By default it is set to `/data/` 
5. Run `npm run build`
6. The built files will be placed in the dist directory. These can then be placed on an aws bucket. Follow instructions from your AWS SA to set up an s3 bucket and cloudfront.

**Note**: When deploying JavaScript code that relies on Node.js packages, always use `npm ci` to install node modules. `npm install` should only be used when making changes to the code and there is a need to update the versions of the packages that are specified in `package.json` as this will upgrade package versions and could introduce breaking changes.

## Configuration

1. Update the `./src/js/missions.js` file:
  * Set the `missions` variable so that it each entry contains a `url` key for the CloudFront URL and the `path` key indicating which CF behavior (origin server -> bucket) the entry should reference.
  * Set the `exclude_prefixes` array so that any prefixes that shouldn't be included are ommitted from the directory listing
2. Update CloudFront origin and behaviors
3. Create/Update Cognito