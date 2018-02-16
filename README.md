# Udia Server

[![Build Status](https://img.shields.io/travis/udia-software/udia-server.svg)](https://travis-ci.org/udia-software/udia-server)
[![Coverage Status](https://img.shields.io/coveralls/github/udia-software/udia-server.svg)](https://coveralls.io/github/udia-software/udia-server?branch=master)
[![David](https://img.shields.io/david/udia-software/udia-server.svg)](https://david-dm.org/udia-software/udia-server)
[![David](https://img.shields.io/david/dev/udia-software/udia-server.svg)](https://david-dm.org/udia-software/udia-server?type=dev)

* Note: This is not ready for production.

## Quickstart

1. Clone this repository and change directory into it.
    * `git clone https://github.com/udia-software/udia-server.git && cd udia-server`

**With Docker**

2. Ensure docker is running.
3. Run `docker-compose up`.

**Without Docker**

2. Ensure an instance of mongo is running. `mongod`
3. Run `npm install` and `npm start`

**Afterwards**

4. GraphQL endpoint should be up at [http://localhost:3000/graphql](http://localhost:3000/graphql) and GraphiQL should be up at [http://localhost:3000/graphiql](http://localhost:3000/graphiql).

## Environment Variables

Set these, or use the defaults.

| Environment Variable Name | Default Value                     | Description                       |
|---------------------------|-----------------------------------|-----------------------------------|
| `NODE_ENV`                | `development`                     | `development` `test` `production` |
| `JWT_SECRET`              | `UDIA Development JWT Secret Key` | JWT Secret Key                    |
| `MONGODB_URI`             | `mongodb://localhost:27017`       | Connection string for MongoDB     |
| `MONGODB_DB_NAME`         | ` `                               | MongoDB Name (Unsed in dev/test)  |
| `PORT`                    | `3000`                            | Port for serving http server      |
| `SALT_ROUNDS`             | `12`                              | Number of bcrypt rounds           |
| `TEST_JWT`                | ` `                               | JWT to use for graphiql in dev    |
| `SMTP_USERNAME`           | `da4a6rdcusm7e2wt@ethereal.email` | SMTP username (ethereal default)  |
| `SMTP_PASSWORD`           | `KtebcCbvkwDWsACqsB`              | SMTP password                     |
| `SMTP_HOST`               | `smtp.ethereal.email`             | SMTP host (defaults to ethereal)  |
| `SMTP_PORT`               | `587`                             | SMTP port                         |
| `EMAIL_TOKEN_TIMEOUT`     | `3600000`                         | Timed email token validity (1hr)  |
| `REDIS_URL`               | ` `                               | Redis conn (optional in dev)      |

## License

[Common Public Attributions License V1.0](LICENSE)
