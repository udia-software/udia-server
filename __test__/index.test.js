"use strict";

const start = require("../src/index");

describe("Index", () => {
  it("should initialize without crashing", async done => {
    const server = await start();
    // Wait 10ms to setup subscriptionServer
    setTimeout(async () => {
      await server.close();
      done();
    }, 10);
  });

  it("should immediately close without crashing", async done => {
    const server = await start();
    // closes before subscription server starts
    await server.close();
    done();
  });
});
