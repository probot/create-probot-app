# Create Probot App

This project will generate a new [Probot](https://github.com/probot/probot) app
with everything you need to get started building. 👷🏽‍

In particular, this command line interface allows you to select from our pre-defined blue prints to choose a basic working example to start from.

## Getting started with Blue Prints 🛠

```sh
npx create-probot-app my-first-app -t basic-js
```

This template is a JavaScript app that will post a comment every time an issue is opened.

```sh
npx create-probot-app my-first-app -t basic-ts
```

This template is a TypeScript app that will post a comment every time an issue is opened.

```sh
npx create-probot-app my-first-app -t checks-js
```

This template is a JavaScript app that will create a new [check](https://developer.github.com/v3/checks/) every time a push happens.

```sh
npx create-probot-app my-first-app -t git-data-js
```

This template is a JavaScript app that will create a new [pull request](https://developer.github.com/v3/pulls/#create-a-pull-request) using the [Git Data API](https://developer.github.com/v3/git/) every time someone installs your app.

```sh
npx create-probot-app my-first-app -t deploy-js
```

This template is a JavaScript app that will create a new [deployment](https://developer.github.com/v3/repos/deployments/) every time someone opens or pushes to a pull request.

If you're using Yarn:

```sh
yarn create probot-app my-first-app
```

See the [Probot docs](https://probot.github.io/docs/development/#running-the-app-locally) to get started running your app locally.
