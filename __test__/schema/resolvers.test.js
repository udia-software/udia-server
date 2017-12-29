"use strict";

const axios = require("axios");
const start = require("../../src/index");
const testHelper = require("../testhelper");
const { PORT } = require("../../src/constants");

let server = null;
let client = null;

beforeAll(async done => {
  await testHelper.initializeTestState();
  server = await start();
  client = axios.create(`0.0.0.0:${PORT}`);
  done();
});

afterAll(async done => {
  await server.close();
  await testHelper.tearDownTestState(true);
  done();
});

describe("Resolvers", () => {
  describe("Query", () => {
    it("should validly query for all nodes", async done => {
      const query = `
      query allNodes() {
        allNodes() {
          _id
          dataType
          relationType
          title
          content
          parent
          children
          createdBy
          createdAt
          updatedAt
        }
      }`;
      const data = { query, variables: {} };
      const response = await client.post("/graphql", data);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect.assertions(2);
      done();
    });
  });
});
