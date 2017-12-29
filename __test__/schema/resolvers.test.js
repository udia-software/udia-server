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
  client = axios.create({ baseURL: `http://0.0.0.0:${PORT}` });
  done();
});

beforeEach(async done => {
  await testHelper.tearDownTestState(false);
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
      query allNodes(
        $filter: NodeFilter,
        $orderBy: NodeOrderBy,
        $skip: Int,
        $first: Int
      ) {
        allNodes(
          filter: $filter,
          orderBy: $orderBy,
          skip: $skip,
          first: $first
        ) {
          _id
          dataType
          relationType
          title
          content
          parent {
            _id
          }
          children {
            _id
          }
          createdBy {
            _id
          }
        }
      }`;
      let data = { query };
      const noNodesResponse = await client.post("/graphql", data);
      expect(noNodesResponse.status).toBe(200);
      expect(noNodesResponse.data).toEqual({ data: { allNodes: [] } });

      const db = await testHelper.getDatabase();
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({
        createdBy
      });
      const commentNode = await testHelper.generateTestNode({
        createdBy,
        relationType: "COMMENT",
        parentId: node._id + ""
      });

      data = { query, variables: { filter: { parent: node._id + "" } } };
      const queryResponse = await client.post("/graphql", data);
      expect(queryResponse.status).toBe(200);
      expect(queryResponse.data).toEqual({
        data: {
          allNodes: [
            {
              _id: "" + commentNode._id,
              children: null,
              content: "Test Node Content",
              createdBy: { _id: "" + createdBy._id },
              dataType: "TEXT",
              parent: { _id: "" + node._id },
              relationType: "COMMENT",
              title: "Test Node"
            }
          ]
        }
      });
      done();
    });

    it("should validly query for me", async done => {
      const query = `
      query me {
        me {
          _id
          username
          nodes {
            _id
          }
          email
        }
      }`;
      let data = { query };
      const noUserResponse = await client.post("/graphql", data);
      expect(noUserResponse.status).toBe(200);
      expect(noUserResponse.data).toEqual({ data: { me: null } });

      const resolverUser = await testHelper.createTestUser({});
      const jwt = await testHelper.getJWT({});
      const userResponse = await client.post("/graphql", data, {
        headers: { authorization: jwt }
      });
      expect(userResponse.status).toBe(200);
      expect(userResponse.data).toEqual({
        data: {
          me: {
            _id: "" + resolverUser._id,
            email: resolverUser.email,
            nodes: null,
            username: resolverUser.username
          }
        }
      });

      const badUserResponse = await client.post("/graphql", data, {
        headers: { authorization: "badjwt" }
      });
      expect(badUserResponse.status).toBe(200);
      expect(badUserResponse.data).toEqual({ data: { me: null } });

      done();
    });
  });
});
