# Setup for macOS

One time development environment setup on macOS

> Scripts are `bash`

## Misc

### Finder

Show hidden files:

```bash
defaults write com.apple.finder AppleShowAllFiles YES
```

Hold the 'Option/alt' key, then right click on the Finder icon in the dock and click Relaunch

## Tools

### Homebrew

Install Homebrew:

```bash
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

### bash 5+

> macOS comes with outdated version of bash. Install latest version.

```bash
brew update
brew install bash
```
### Apple Command Line Tools

```bash
xcode-select --install
```

### Nvm

`nvm` is node.js version manager.

``` bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.4/install.sh | bash
```

Close and reopen terminal.

### Node.js

Install via `nvm`:

```bash
nvm install v18.12.1
```

Make sure you do not have default node set:

```bash
nvm unalias default
```

Activate node 18.12.1:

```bash
nvm use 18.12.1
```

#### Configure npm

Configure `npm` (Node Package Manager) to save versions of packages in `packages.json`. This way you can have the same stable environment on all development machines:

``` bash
npm config set save=true
npm config set save-exact=true
```

### eslint

```bash
nvm use 18.12.1
npm install --global eslint
```

### GitHub CLI

```bash
brew install gh
```

### AWS CLI

```bash
cd ~/Downloads
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### AWS Authentication

For additional AWS setup see [AWS](./aws.md)
