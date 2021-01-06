# {{ appName }}

> A GitHub App built with [Probot](https://github.com/probot/probot) that {{ description }}

## Setup

```sh
# Install dependencies
npm install

{{#if toBuild}}
# Compile
npm build

{{/if}}
# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t {{ appName }} .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> {{ appName }}
```

## Contributing

If you have suggestions for how {{ appName }} could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © {{{ year }}} {{{ author }}}
