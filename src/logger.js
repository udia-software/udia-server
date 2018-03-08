const util = require("util");
const { createLogger, format, transports } = require("winston");
const { NODE_ENV } = require("./constants");

const loggerConfig = {
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [new transports.Console()],
  exitOnError: false
};

let logger = null;

switch (NODE_ENV) {
  // coverage don't care about production logger configuration
  /* istanbul ignore next */
  case "production":
    logger = createLogger(loggerConfig).add(
      new transports.File({
        filename: "logs/prod.log",
        maxsize: 10 * 1024 * 1024,
        maxFiles: 8,
        tailable: true
      })
    );
    break;
  case "test":
    logger = createLogger({ ...loggerConfig, level: "debug" })
      .clear()
      .add(
        new transports.File({
          filename: "logs/test.log",
          maxsize: 10 * 1024 * 1024,
          maxFiles: 1,
          tailable: true
        })
      );
    break;
  // coverage don't care about development logger configuration
  /* istanbul ignore next */
  default:
    logger = createLogger({
      ...loggerConfig,
      format: format.combine(format.timestamp(), format.prettyPrint()),
      level: "debug"
    }).add(
      new transports.File({
        filename: "logs/dev.log",
        maxsize: 10 * 1024 * 1024,
        maxFiles: 8,
        tailable: true
      })
    );
}

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
    // coverage don't care about options no body edge case
    /* istanbul ignore next */
    const reqOpName = (res.req.body || {}).operationName || "GQL-NO-OP";
    const responseTime = new Date() - reqStarted;
    res.end = resEnd;
    res.end(chunk, encoding);

    let error = null;
    // coverage don't care about end chunks
    /* istanbul ignore next */
    if (chunk) chunks.push(new Buffer(chunk));

    if (reqOpName !== "GQL-NO-OP") {
      const resBody = Buffer.concat(chunks).toString("utf8");
      try {
        const {data, errors} = JSON.parse(resBody);
        logger.debug(data || {});
        logger.debug(errors || {});
        error = !!errors;
      } catch (error) {
        // coverage don't care about edge case server returns malformed JSON
        /* istanbul ignore next */
        logger.error(error);
      }
    }
    // coverage don't care about middleware logging
    /* istanbul ignore next */
    logger.info(
      util.format(
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

logger.debug("instantiate logger");

module.exports = {
  middlewareLogger,
  logger
};
