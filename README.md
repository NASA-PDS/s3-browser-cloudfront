# PDS S3 Web Browser Using Cloudfront

## Full Original Instructions For MacOS

For one time setup instructions see [setup for macOS](./docs/setup-mac.md)

For everyday use see [work on macOS](./docs/work-mac.md)

## Deployment Short Version

1. Clone this repository.
2. Run `nvm` (go to https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro to install nvm)
3. Run `npm install` (go to https://nodejs.org/en to install nodejs)
4. Open `webpack.config.js` Search for `new webpack.EnvironmentPlugin` and change the value for `PUBLIC_PATH` to the desired path the application will be deployed to. By default it is set to `/data/` 
5. Run `npm run build`
6. The built files will be placed in the dist directory. These can then be placed on an aws bucket. Follow instructions from your AWS SA to set up an s3 bucket and cloudfront.

