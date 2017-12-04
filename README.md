# Udia Server

[![Build Status](https://travis-ci.org/udia-software/udia-server.svg?branch=master)](https://travis-ci.org/udia-software/udia-server)
[![Coverage Status](https://coveralls.io/repos/github/udia-software/udia-server/badge.svg?branch=master)](https://coveralls.io/github/udia-software/udia-server?branch=master)

* Note: This is not ready for production.

## Quickstart

1. Ensure an instance of mongo is running. `mongod`
2. Clone this repository, run `npm install` and `npm start`

## Environment Variables

Set these, or use the defaults.

| Environment Variable Name | Default Value                     | Description                       |
|---------------------------|-----------------------------------|-----------------------------------|
| `NODE_ENV`                | `development`                     | `development` `test` `production` |
| `MONGODB_URI`             | `mongodb://localhost:27017/udia`  | Connection string for MongoDB     |
| `JWT_SECRET`              | `UDIA Development JWT Secret Key` | JWT Secret Key                    |
| `PORT`                    | `3000`                            | Port for serving http server      |
| `TEST_JWT`                | ` `                               | JWT to use for graphiql in dev    |

## License

[Common Public Attributions License V1.0](LICENSE)
