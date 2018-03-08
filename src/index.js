"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const { execute, subscribe, formatError } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { format } = require("util");

const {
  PORT,
  NODE_ENV,
  TEST_JWT,
  SALT_ROUNDS,
  MONGODB_DB_NAME
} = require("./constants");
const logger = require("./logger");
const connectMongo = require("./connectMongo");
const schema = require("./schema");
const { verifyUserJWT } = require("./modules/Auth");
const AuditManager = require("./modules/AuditManager");
const NodeManager = require("./modules/NodeManager");
const UserManager = require("./modules/UserManager");

const _buildMongoIndexes = async db => {
  const usersIndexes = [
    {
      key: {
        username: 1
      },
      collation: { locale: "en", strength: 2 },
      name: "username",
      unique: true
    },
    {
      key: {
        email: 1
      },
      collation: { locale: "en", strength: 2 },
      name: "email",
      unique: true
    }
  ];
  try {
    await db.collection("users").createIndexes(usersIndexes);
  } catch (error) /* istanbul ignore next */ {
    // Coverage don't care about rebuilding the indexes
    await db.collection("users").dropIndexes();
    await db.collection("users").createIndexes(usersIndexes);
  }
};

const middlewareLogger = (req, res, next) => {
  const reqStarted = new Date();
  const reqURL = req.url;
  const resWrite = res.write;
  const resEnd = res.end;
  const chunks = [];

  res.write = chunk => {
    chunks.push(new Buffer(chunk));
    resWrite.call(res, chunk);
  };

  res.end = (chunk, encoding) => {
    const reqOpName = ((res.req || {}).body || {}).operationName || "GQL-NO-OP";
    const responseTime = new Date() - reqStarted;
    res.end = resEnd;
    res.end(chunk, encoding);

    let error = null;
    if (chunk) chunks.push(new Buffer(chunk));

    if (reqOpName !== "GQL-NO-OP") {
      const resBody = Buffer.concat(chunks).toString("utf8");
      try {
        const jsonResBody = JSON.parse(resBody);
        error = !!jsonResBody.errors;
      } catch (error) {
        logger.warn(error);
      }
    }
    logger.info(
      format(
        "%s %s %s %s %s %dms",
        res.statusCode,
        req.method,
        reqURL,
        reqOpName,
        error === null ? "OK" : error ? "GQL-ERR" : "GQL-OK",
        responseTime
      )
    );
  };
  next();
};

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
    db = _mongo.db(MONGODB_DB_NAME);
  } else {
    throw new Error(
      `NODE_ENV must be 'test', 'development' or 'production'. (currently ${NODE_ENV})`
    );
  }

  await _buildMongoIndexes(db);

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
      schema,
      debug: false
    };
  };
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
  app.use(middlewareLogger);
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
  const subscriptionServer = SubscriptionServer.create(
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
  server.listen(PORT, () => {
    logger.info(`UDIA GraphQL ${NODE_ENV} server running on port ${PORT}.`);
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
