"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe, formatError } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");

const { PORT, NODE_ENV, TEST_JWT } = require("./constants");
const connectMongo = require("./connectMongo");
const schema = require("./schema");
const { verifyUserJWT } = require("./modules/Auth");
const NodeManager = require("./modules/NodeManager");
const UserManager = require("./modules/UserManager");

const start = async () => {
  const db = await connectMongo().catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
  const app = express();

  const buildOptions = async req => {
    const userManager = new UserManager(db.collection("users"));
    let user = await verifyUserJWT(req, userManager).catch(() => {
      return null;
    });
    return {
      context: {
        Users: userManager,
        Nodes: new NodeManager(db.collection("nodes")),
        user
      },
      formatError: error => {
        return {
          ...formatError(error),
          state: error.originalError && error.originalError.state
        };
      },
      schema
    };
  };

  app.use(cors());
  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));
  if (NODE_ENV !== "production") {
    const jwt = TEST_JWT; // hardcode user jwt for testing purposes
    app.use(
      "/graphiql",
      graphiqlExpress({
        endpointURL: "/graphql",
        passHeader: (jwt && `'Authorization': '${jwt}'`) || null,
        subscriptionsEndpoint: `ws://0.0.0.0:${PORT}/subscriptions`
      })
    );
  }

  const server = createServer(app);
  let subscriptionServer = null;
  server.listen(PORT, () => {
    subscriptionServer = SubscriptionServer.create(
      {
        execute,
        subscribe,
        schema
      },
      {
        server,
        path: "/subscriptions"
      }
    );
    if (NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(`UDIA GraphQL server running on port ${PORT}.`);
    }
  });

  server.on("close", async () => {
    // subscriptionServer can be null if close called immediately after server start
    if (subscriptionServer) {
      await subscriptionServer.close();
    }
    if (db) {
      await db.close();
    }
  });

  return server;
};

if (require.main === module) {
  start();
}

module.exports = start;
