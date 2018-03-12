"use strict";

const axios = require("axios");
const start = require("../src/index");
const { PORT } = require("../src/constants");

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

  it("should return metrics", async done => {
    const server = await start();
    const client = axios.create({ baseURL: `http://0.0.0.0:${PORT}` });
    const metrics = await client.get("/");
    expect(metrics.data).toHaveProperty("arch");
    expect(metrics.data).toHaveProperty("cpus");
    expect(metrics.data).toHaveProperty("endianness");
    expect(metrics.data).toHaveProperty("freemem");
    expect(metrics.data).toHaveProperty("hostname");
    expect(metrics.data).toHaveProperty("loadavg");
    expect(metrics.data).toHaveProperty("platform");
    expect(metrics.data).toHaveProperty("release");
    expect(metrics.data).toHaveProperty("timestamp");
    expect(metrics.data).toHaveProperty("totalmem");
    expect(metrics.data).toHaveProperty("uptime");
    expect(metrics.data).toHaveProperty("version");
    await server.close();
    done();
  });
});
