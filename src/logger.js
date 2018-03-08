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
    logger = createLogger({ ...loggerConfig, level: "debug" }).add(
      new transports.File({
        filename: "logs/dev.log",
        maxsize: 10 * 1024 * 1024,
        maxFiles: 8,
        tailable: true
      })
    );
}

logger.debug("instantiate logger");

module.exports = logger;
