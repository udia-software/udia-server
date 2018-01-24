"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe, formatError } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");

const { PORT, NODE_ENV, TEST_JWT, SALT_ROUNDS } = require("./constants");
const connectMongo = require("./connectMongo");
const schema = require("./schema");
const { verifyUserJWT } = require("./modules/Auth");
const AuditManager = require("./modules/AuditManager");
const NodeManager = require("./modules/NodeManager");
const UserManager = require("./modules/UserManager");

const start = async () => {
  const _mongo = await connectMongo().catch(
    // coverage don't care about mongo client connection errors.
    /* istanbul ignore next */
    err => {
      throw err;
    }
  );

  let db = null;
  // coverage don't care env conditional db.
  /* istanbul ignore next */
  if (NODE_ENV === "test") {
    db = _mongo.db("udiatest");
  } else if (NODE_ENV === "development") {
    db = _mongo.db("udiadev");
  } else if (NODE_ENV === "production") {
    db = _mongo.db("udia");
  } else {
    throw new Error(
      `NODE_ENV must be 'test', 'development' or 'production'. (currently ${NODE_ENV})`
    );
  }

  // coverage don't care about production salt rounds.
  /* istanbul ignore next */
  if (NODE_ENV === "production") {
    if ((+SALT_ROUNDS || 0) < 12) {
      const saltErr = `Salt Rounds cannot be less than 12. (currently ${SALT_ROUNDS})`;
      throw new Error(saltErr);
    }
  }

  const app = express();

  const buildOptions = async req => {
    const userManager = new UserManager(db.collection("users"));
    const user = await verifyUserJWT(req, userManager);
    return {
      context: {
        Audits: new AuditManager(db.collection("audits")),
        Users: userManager,
        Nodes: new NodeManager(db.collection("nodes")),
        user,
        originIp: req.ip
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
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
  app.use(cors());
  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));
  // coverage don't care about vetting developer graphiql route
  /* istanbul ignore next */
  if (NODE_ENV !== "production") {
    const jwt = TEST_JWT; // hardcode user jwt for testing purposes
    app.use(
      "/graphiql",
      graphiqlExpress({
        endpointURL: "/graphql",
        passHeader: (jwt && `'Authorization': '${jwt}'`) || null,
        subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
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
        schema,
        onConnect: args => {
          return {
            ...args,
            Nodes: new NodeManager(db.collection("nodes")),
            Users: new UserManager(db.collection("users"))
          };
        }
      },
      {
        server,
        path: "/subscriptions"
      }
    );
    // coverage don't care about non test console output.
    /* istanbul ignore next */
    if (NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(`UDIA GraphQL server running on port ${PORT}.`);
    }
  });

  server.on("close", async () => {
    // subscriptionServer can be null if server immediately closes
    subscriptionServer && (await subscriptionServer.close());
    await _mongo.close();
  });

  return server;
};

// coverage don't care about `node index.js`
/* istanbul ignore next */
if (require.main === module) {
  start();
}

module.exports = start;
