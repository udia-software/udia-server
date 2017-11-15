const express = require("express");
const bodyParser = require("body-parser");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { Logger, MongoClient } = require("mongodb");

const { MONGO_URI } = require("./constants");
const schema = require("./schema");
const { authenticate } = require("./authentication");
const buildDataloaders = require("./dataloaders");
const formatError = require("./formatError");

const connectMongo = async () => {
  const db = await MongoClient.connect(MONGO_URI);

  // Performance Logging
  // let logCount = 0;
  // Logger.setCurrentLogger((msg, state) => {
  //   console.log(`MONGO DB REQUEST ${++logCount}: ${msg}`);
  // });
  // Logger.setLevel('debug');
  // Logger.filter('class', ['Cursor']);

  return {
    Links: db.collection("links"),
    Users: db.collection("users"),
    Votes: db.collection("votes")
  };
};

const start = async () => {
  const PORT = process.env.port || 3000;
  const mongo = await connectMongo();
  var app = express();

  const buildOptions = async (req, res) => {
    const user = await authenticate(req, mongo.Users);
    return {
      context: {
        dataloaders: buildDataloaders(mongo),
        mongo,
        user
      },
      formatError,
      schema
    };
  };

  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));
  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql",
      passHeader: `'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVhMGI3Nzg2ODNjMWNmNmNhM2I5MzZmOSIsImlhdCI6MTUxMDcxOTY2MiwibmJmIjoxNTEwNzE5NjYyLCJleHAiOjE1MTA4OTI0NjJ9.52jFKYv4pjUNqiiqGy-_TKDNCZLB6il4Lrq3Y20q3E4'`,
      subscriptionsEndpoint: `ws://0.0.0.0:${PORT}/subscriptions`
    })
  );

  const server = createServer(app);
  server.listen(PORT, () => {
    SubscriptionServer.create(
      { execute, subscribe, schema },
      { server, path: "/subscriptions" }
    );
    console.log(`UDIA GraphQL server running on port ${PORT}.`);
  });
};

start();
