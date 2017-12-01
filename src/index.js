"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe, formatError } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");

const { PORT } = require("./constants");
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
  
    let user = null;
    try {
      user = await verifyUserJWT(req, userManager);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Could not parse JWT", err);
      user = null;
    }
  
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
  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVhMjE5MmRlOTU1ZTM2MGUzMjI4NWI1NiIsImlhdCI6MTUxMjE0OTc0MywibmJmIjoxNTEyMTQ5NzQzLCJleHAiOjE1MTIzMjI1NDN9.ugdUkXXav1CgJlLYE9x5N3Gjo7Es42jJ27fbldHORkQ";

  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));
  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql",
      passHeader: jwt && `'Authorization': '${jwt}'` || null,
      subscriptionsEndpoint: `ws://0.0.0.0:${PORT}/subscriptions`
    })
  );

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
