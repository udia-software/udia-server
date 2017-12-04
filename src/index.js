"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe, formatError } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");

const { PORT, NODE_ENV, TEST_JWT } = require("./constants");
const connectMongo = require("./connectMongo");
const schema = require("./schema");
const { verifyUserJWT } = require("./modules/Auth");
const LinkManager = require("./modules/LinkManager");
const NodeManager = require("./modules/NodeManager");
const UserManager = require("./modules/UserManager");
const VoteManager = require("./modules/VoteManager");

const start = async () => {
  const db = await connectMongo();
  const app = express();

  const buildOptions = async req => {
    const userManager = new UserManager(db.collection("users"));
    let user = await verifyUserJWT(req, userManager);
    return {
      context: {
        Users: userManager,
        Nodes: new NodeManager(db.collection("nodes")),
        Votes: new VoteManager(db.collection("votes")),
        Links: new LinkManager(db.collection("links")),
        user
      },
      formatError: error => {
        return {
          ...formatError(error),
          field: error.originalError && error.originalError.field
        };
      },
      schema
    };
  };

  // developer route. this will change if you nuke the db

  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));
  if (NODE_ENV !== "production") {
    const jwt = TEST_JWT;
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
  server.listen(PORT, () => {
    SubscriptionServer.create(
      { execute, subscribe, schema },
      { server, path: "/subscriptions" }
    );
    // eslint-disable-next-line no-console
    console.log(`UDIA GraphQL server running on port ${PORT}.`);
  });
};

start();
