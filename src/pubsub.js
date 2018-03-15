"use strict";
const { PubSub } = require("graphql-subscriptions");
const { RedisPubSub } = require("graphql-redis-subscriptions");
const { REDIS_URL } = require("./constants");
const { metric } = require("./metric");

// default development pubSub object
let pubSub = new PubSub();

// coverage won't test redis
/* istanbul ignore next */
// If the redis url environment variable is set, upgrade
if (REDIS_URL) {
  pubSub = new RedisPubSub({
    connection: REDIS_URL
  });
}

module.exports = pubSub;
