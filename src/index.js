"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe, formatError } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { Logger, MongoClient } = require("mongodb");

const { NODE_ENV, MONGO_URI, PORT } = require("./constants");
const schema = require("./schema");
const { verifyUserJWT } = require("./modules/Auth");
const LinkManager = require("./modules/LinkManager");
const UserManager = require("./modules/UserManager");
const VoteManager = require("./modules/VoteManager");

const connectMongo = async () => {
  const db = await MongoClient.connect(MONGO_URI);

  // Development Performance Logging
  if (NODE_ENV === "development") {
    let logCount = 0;
    Logger.setCurrentLogger(msg => {
      // eslint-disable-next-line no-console
      console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
    });
    Logger.setLevel("debug");
    Logger.filter("class", ["Cursor"]);
  }

  return {
    Links: db.collection("links"),
    Users: db.collection("users"),
    Votes: db.collection("votes")
  };
};

const start = async () => {
  const mongo = await connectMongo();
  let app = express();

  const buildOptions = async (req, res, next) => {
    const userManager = new UserManager(mongo.Users);
    const user = await verifyUserJWT(req, userManager);
    return {
      context: {
        Users: userManager,
        Votes: new VoteManager(mongo.Votes),
        Links: new LinkManager(mongo.Links),
        user
      },
      formatError: error => {
        const data = formatError(error);
        const { originalError } = error;
        data.field = originalError && originalError.field;
        return data;
      },
      schema
    };
  };

  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));
  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql",
      passHeader: "'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVhMGNjMmFjMDcyZTA5OTllOWNlMDM3ZiIsImlhdCI6MTUxMDc4NjQxMCwibmJmIjoxNTEwNzg2NDEwLCJleHAiOjE1MTA5NTkyMTB9.est14Z3S_wiPpeGWa2A8QPmvE2S-C_jDGJbgl_4N3co'",
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
