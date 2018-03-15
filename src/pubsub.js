"use strict";
const { PubSub } = require("graphql-subscriptions");
const { RedisPubSub } = require("graphql-redis-subscriptions");
const { REDIS_URL } = require("./constants");

// default development pubSub object
let pubSub = new PubSub();

// coverage won't test redis
/* istanbul ignore next */
// If the redis url environment variable is set, upgrade
if (REDIS_URL) {
  pubSub = new RedisPubSub({
    connection: REDIS_URL,
    reviver: (key, value) => {
      const isISO8601Z = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
      if (typeof value === "string" && isISO8601Z.test(value)) {
        const tempDateNumber = Date.parse(value);
        if (!isNaN(tempDateNumber)) {
          return new Date(tempDateNumber);
        }
      }
      return value;
    }
  });
}

module.exports = pubSub;
