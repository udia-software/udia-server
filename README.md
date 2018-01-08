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
| `MONGODB_URI`             | `mongodb://localhost:27017`       | Connection string for MongoDB     |
| `JWT_SECRET`              | `UDIA Development JWT Secret Key` | JWT Secret Key                    |
| `PORT`                    | `3000`                            | Port for serving http server      |
| `TEST_JWT`                | ` `                               | JWT to use for graphiql in dev    |

## License

[Common Public Attributions License V1.0](LICENSE)
