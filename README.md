# Udia Server

* Note: This is not ready for production.

## Quickstart

1. Ensure an instance of mongo is running. `mongod`
2. Clone this repository, run `npm install` and `npm start`

## Environment Variables

Set these, or use the defaults.

| Environment Variable Name | Default Value                     | Description                   |
|---------------------------|-----------------------------------|-------------------------------|
| `NODE_ENV`                | `development`                     | `development | test | prod`   |
| `MONGO_DB_URI`            | `mongodb://localhost:27017/udia`  | Connection string for MongoDB |
| `JWT_SECRET`              | `UDIA Development JWT Secret Key` | JWT Secret Key                |
| `PORT`                    | `3000`                            | Port for serving http server  |

## License

[Common Public Attributions License V1.0](LICENSE)
