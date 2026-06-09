# PDS S3 Web Browser Using Cloudfront

## MacOS

For one time setup instructions see [setup for macOS](./docs/setup-mac.md)

For everyday use see [work on macOS](./docs/work-mac.md)

## Getting started

### Node.js

Use the version in [`.nvmrc`](./.nvmrc). Install [Node.js](https://nodejs.org) directly, or use [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro) and run `nvm use` in the repo root.

## Local Development

1. Clone this repository and `cd` into it.
2. Install or select Node.js per [Prerequisites](#prerequisites).
3. Run `nvm use` to switch to the latest compatible version of node.
4. Run `npm ci`. If package.json is missing run `npm install` instead. The ci command needs a package.json to work.
5. Edit dev server port in webpack.config.js to an available port on your localhost. Under plugins -> devServer -> `port: 9002`.
6. Run `npm run start`.
7. Open a browser and go to `localhost:9002` or `localhost:<port>`.

## Deployment

This application is designed to work in AWS. It needs an S3 bucket that holds the source code and a cloudfront to serve it. Any data bucket it is meant to read needs its own cloudfront set up. Terraform is used to create the s3-bucket and the cloudfront.

### Edit configuration for source code build

1. Edit the bucketEndpoints object inside bucketEndpoints.js with the endpoints s3-browser should traverse.
2. Edit webpack.config.js with the location url at which the app will be deployed. The default is set to /data in other words `https://<site>/data`. Edit `PUBLIC_PATH: '/data/'`, `publicPath: '/data/'`, `index: '/data/index.html'` with your expected path.
3. Run `npm run build`. This will create the distribution code in the /dist directory. This is what will need to be uploaded to the s3-bucket

### Terraform

The S3 bucket is managed by terraform. More details here. https://github.com/NASA-PDS/pds-tf-modules/blob/main/terraform/modules/s3/README.md

1. `cd terraform`
2. There are 3 backends that can be used -dev, -test, -prod. Run `terraform init -backend-config=backend-dev.hcl -lock=false` replacing `backend-dev.hcl` with the the correct environment.
3. If changing backend after init was already run add -reconfigure. ` terraform init -reconfigure -backend-config=backend-dev.hcl -lock=false` 
4. Update the terraform.tfvars file with the expected values.
5. `terraform validate`
6. Plan the changes `terraform plan -var-file=terraform.tfvars -lock=false` review the output to make sure the changes are expected.
7. Run `terraform apply -var-file=terraform.tfvars -lock=false` to apply the changes.
8. Login to the AWS Console with your AWS Account. Verify that the s3-bucket was created.
9. Upload the distribution code in the /dist file from the build step into the s3-bucket.
10. Run the cloudfront terraform at https://github.com/NASA-PDS/pds-mcp-infra/tree/main/terraform/cloudfront It will create the cloudfront environment and attach a policy to the s3 bucket that allows cloudfront to serve it.