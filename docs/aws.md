# JPL AWS

## AWS Credentials

### `aws-login` 

Download `v1.4.2a`  or latest version of `aws-login.darwin.amd64` from the [Access-Key-Generation repo](https://github.jpl.nasa.gov/cloud/Access-Key-Generation/releases).

 Install:

```bash
cd ~/Downloads

gh auth login --web --git-protocol ssh --hostname github.jpl.nasa.gov 

gh release download v1.4.2.a \
  --repo https://github.jpl.nasa.gov/cloud/Access-Key-Generation \
  --pattern aws-login.darwin.amd64 --clobber
  
sudo cp ~/Downloads/aws-login.darwin.amd64 /usr/local/bin/aws-login

pushd /usr/local/bin

sudo chmod +x aws-login
sudo xattr -r -d com.apple.quarantine aws-login

popd
```

Test:

```bash
aws-login --help
```

### Generate Access key ID and Secret access key

We use the AWS **Public** cloud, so specify `--pub`:

```bash
aws-login --pub --region us-west-2 --profile aria
```

When asked provide your JPL username and password, and PIN+RSA Token. 

The files generated by the CLI for a profile look similar to the following:

**`~/.aws/credentials`**

```bash
cat ~/.aws/credentials
```

```ini
[aria]
output = json
region = us-west-2
aws_access_key_id=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
aws_session_token = EXAMPLE123ETC//////////
#expiration date = 2020-12-29 21:30:44-08:00
```

**`~/.aws/config`**

```bash
cat ~/.aws/config
```

```ini
[profile aria]
output = json
region = us-west-2
select_role_arn = arn:aws:iam::12345678:role/your_role
```

Test:

```bash
aws --profile jpl s3 ls
```

Set default profile so that you do not have to specify it every time you run commands:

```bash
export AWS_DEFAULT_PROFILE=aria
echo 'export AWS_DEFAULT_PROFILE=aria' >> ~/.bash_profile
```

Test again:

```bash
aws s3 ls
```

### Renew AWS Session Token

By default the session token duration cannot exceed 4 hours. 

If you have set the  `AWS_DEFAULT_PROFILE`  environment variable, to refresh your session token, simply run `aws-login` without any parameters:

```bash
aws-login
```

## Disable CLI pager

```bash
aws configure set cli_pager "" --profile aria
```

## AWS Console

To login to AWS Console UI:

```bash
open https://sso3.jpl.nasa.gov/awsconsole
```

In the browser, sign in with you JPL username and password and provide your JPL PIN+RSA token.

## S3

### Test

List objects:

```bash
aws s3 ls s3://aria-share
```

Upload an object:

```bash
aws s3 cp dist/index.html s3://aria-share
```

Download object:

```bash
aws s3 cp s3://aria-share/index.html ~/index.html.copy
```

Backup the web site code:

```bash
mkdir -p ~/Downloads/aria-share-backup
cd ~/Downloads/aria-share-backup

aws s3 cp s3://aria-share/index.html .
aws s3 cp s3://aria-share/list.js .
aws s3 cp s3://aria-share/index-style ./index-style --recursive
```

Show command usage:

```
aws s3 cp help
```

