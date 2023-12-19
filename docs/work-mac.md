# Work on macOS

## Configure Project

```bash
. configure.sh
```

## Run

```bash
npm start
```

Runs the app in the development mode.\
Open [http://127.0.0.1:8080](http://127.0.0.1:8080) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

## Debug

Run the application:

```bash
npm start
```

In Visual Studio Code, set a breakpoint in `src/js/main.js`. Press `F5` to start the debugger. Refresh the browser.

## Build

```bash
npm run build
```

Builds the app for production to the `dist` folder.

### Preview

To preview the built site

```bash
npx http-server --port 5000 dist
```

## Deploy

```bash
export AWS_DEFAULT_PROFILE=aria

# dry run
aws s3 cp ./dist/index.html s3://aria-share/index.html --dryrun
aws s3 sync ./dist/index-style s3://aria-share/index-style --delete --dryrun

# real deployment
aws s3 cp ./dist/index.html s3://aria-share/index.html
aws s3 sync ./dist/index-style s3://aria-share/index-style --delete
```

Verify:

```bash
open https://aria-share.jpl.nasa.gov
```



## INFO:

### Initialize a new project 

See: https://getbootstrap.com/docs/5.2/getting-started/webpack/



