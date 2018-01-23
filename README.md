# Udia Server

[![Build Status](https://img.shields.io/travis/udia-software/udia-server.svg)](https://travis-ci.org/udia-software/udia-server)
[![Coverage Status](https://img.shields.io/coveralls/github/udia-software/udia-server.svg)](https://coveralls.io/github/udia-software/udia-server?branch=master)
[![David](https://img.shields.io/david/udia-software/udia-server.svg)](https://david-dm.org/udia-software/udia-server)
[![David](https://img.shields.io/david/dev/udia-software/udia-server.svg)](https://david-dm.org/udia-software/udia-server?type=dev)

* Note: This is not ready for production.

## Quickstart

1. Ensure an instance of mongo is running. `mongod`
2. Clone this repository, run `npm install` and `npm start`

## Environment Variables

Set these, or use the defaults.

| Environment Variable Name | Default Value                     | Description                       |
|---------------------------|-----------------------------------|-----------------------------------|
| `NODE_ENV`                | `development`                     | `development` `test` `production` |
| `JWT_SECRET`              | `UDIA Development JWT Secret Key` | JWT Secret Key                    |
| `MONGODB_URI`             | `mongodb://localhost:27017`       | Connection string for MongoDB     |
| `PORT`                    | `3000`                            | Port for serving http server      |
| `SALT_ROUNDS`             | `12`                              | Number of bcrypt rounds           |
| `TEST_JWT`                | ` `                               | JWT to use for graphiql in dev    |
| `SMTP_USERNAME`           | `da4a6rdcusm7e2wt@ethereal.email` | SMTP username (ethereal default)  |
| `SMTP_PASSWORD`           | `KtebcCbvkwDWsACqsB`              | SMTP password                     |
| `SMTP_HOST`               | `smtp.ethereal.email`             | SMTP host (defaults to ethereal)  |
| `SMTP_PORT`               | `587`                             | SMTP port                         |
| `EMAIL_TOKEN_TIMEOUT`     | `3600000`                         | Timed email token validity (1hr)  |
| `REDIS_URL`               | ` `                               | Redis conn (for subscriptions)    |

## License

[Common Public Attributions License V1.0](LICENSE)
