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
            title
          }
          children {
            _id
            title
          }
          createdBy {
            _id
            createdNodes {
              _id
            }
            updatedNodes {
              _id
            }
          }
        }
      }`;

      let data = { query };
      const noNodesResponse = await client.post("/graphql", data);
      expect(noNodesResponse.status).toBe(200);
      expect(noNodesResponse.data).toEqual({ data: { allNodes: [] } });

      await testHelper.getDatabase();
      const createdBy = await testHelper.createTestUser({});
      const node = await testHelper.generateTestNode({
        createdBy,
        title: "Parent Node"
      });
      const commentNode = await testHelper.generateTestNode({
        createdBy,
        relationType: "COMMENT",
        parentId: node._id + "",
        title: "Comment Node"
      });

      const commentQueryOutput = {
        data: {
          allNodes: [
            {
              _id: "" + commentNode._id,
              children: [],
              content: "Test Node Content",
              createdBy: {
                _id: "" + createdBy._id,
                createdNodes: [
                  {
                    _id: "" + node._id
                  },
                  {
                    _id: "" + commentNode._id
                  }
                ],
                updatedNodes: [
                  {
                    _id: "" + node._id
                  },
                  {
                    _id: "" + commentNode._id
                  }
                ]
              },
              dataType: "TEXT",
              parent: { _id: "" + node._id, title: "Parent Node" },
              relationType: "COMMENT",
              title: "Comment Node"
            }
          ]
        }
      };

      data = {
        query,
        variables: {
          filter: {
            parent: node._id + "",
            createdAt_lte: new Date(),
            updatedAt_lte: Date.now() // also handles milisecond timestamps
          }
        }
      };

      const queryResponse = await client.post("/graphql", data);
      expect(queryResponse.status).toBe(200);
      expect(queryResponse.data).toEqual(commentQueryOutput);

      const inlineQuery = `
      query allNodes {
        allNodes(
          filter: { 
            id: "${node._id}"
            createdAt_lte: ${Date.now()},
            updatedAt_lte: "${new Date(Date.now() + 1000).toString()}",
          }
        ) {
          _id
          dataType
          relationType
          title
          content
          parent {
            _id
            title
          }
          children {
            _id
            title
          }
          createdBy {
            _id
            createdNodes {
              _id
            }
            updatedNodes {
              _id
            }
          }
        }
      }`;

      const inlineQueryOutput = {
        data: {
          allNodes: [
            {
              _id: "" + node._id,
              children: [
                {
                  _id: "" + commentNode._id,
                  title: "Comment Node"
                }
              ],
              content: "Test Node Content",
              createdBy: {
                _id: "" + createdBy._id,
                createdNodes: [
                  {
                    _id: "" + node._id
                  },
                  {
                    _id: "" + commentNode._id
                  }
                ],
                updatedNodes: [
                  {
                    _id: "" + node._id
                  },
                  {
                    _id: "" + commentNode._id
                  }
                ]
              },
              dataType: "TEXT",
              parent: null,
              relationType: "POST",
              title: "Parent Node"
            }
          ]
        }
      };

      data = { query: inlineQuery };
      const inlineQueryResponse = await client.post("/graphql", data);
      expect(inlineQueryResponse.status).toBe(200);
      expect(inlineQueryResponse.data).toEqual(inlineQueryOutput);

      data = { query, variables: { filter: 1 } };
      client.post("/graphql", data).catch(err => {
        // invalid queries throw 400, but otherwise GraphQL errors in json
        expect(err.response.status).toBe(400);
        done();
      });
    });

    it("should validly query for me", async done => {
      const query = `
      query me {
        me {
          _id
          username
          createdNodes {
            _id
          }
          updatedNodes {
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
      const testNode = await testHelper.generateTestNode({
        createdBy: resolverUser
      });
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
            createdNodes: [{ _id: "" + testNode._id }],
            updatedNodes: [{ _id: "" + testNode._id }],
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

  describe("Mutation", () => {
    it("should validly create a node", async done => {
      const query = `
      mutation createNode(
        $dataType: NodeDataType!,
        $relationType: NodeRelationType!,
        $title: String!,
        $content: String!,
        $parentId: ID
      ) {
        createNode(
          dataType: $dataType,
          relationType: $relationType,
          title: $title,
          content: $content,
          parentId: $parentId
        ) {
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
          updatedBy {
            _id
          }
        }
      }`;
      const data = {
        query,
        variables: {
          dataType: "TEXT",
          relationType: "POST",
          title: "Test Create Node Resolver",
          content: "Test Create Node Resolver Content String!"
        }
      };
      const mutationResponse = await client.post("/graphql", data);
      expect(mutationResponse.status).toBe(200);
      expect(mutationResponse.data).toEqual({
        data: null,
        errors: [
          {
            locations: [{ column: 9, line: 9 }],
            message: "The request is invalid.",
            path: ["createNode"],
            state: { createdBy: ["User must be authenticated."] }
          }
        ]
      });

      const resolverUser = await testHelper.createTestUser({});
      const jwt = await testHelper.getJWT({});
      const userResponse = await client.post("/graphql", data, {
        headers: { authorization: jwt }
      });
      expect(userResponse.status).toBe(200);
      expect(userResponse.data).toEqual({
        data: {
          createNode: {
            children: [],
            content: "Test Create Node Resolver Content String!",
            createdBy: { _id: "" + resolverUser._id },
            updatedBy: { _id: "" + resolverUser._id },
            dataType: "TEXT",
            parent: null,
            relationType: "POST",
            title: "Test Create Node Resolver"
          }
        }
      });
      done();
    });

    it("should validly update a node", async done => {
      const user = await testHelper.createTestUser({
        username: "creator",
        email: "creator@test.com"
      });
      const node = await testHelper.generateTestNode({
        createdBy: user,
        title: "Newly Created Node",
        content: "This is my new node"
      });
      const jwt = await testHelper.getJWT({ email: "creator@test.com" });
      const query = `
      mutation updateNode(
        $id: ID!,
        $dataType: NodeDataType,
        $title: String
        $content: String
      ) {
        updateNode(
          id: $id,
          dataType: $dataType,
          title: $title,
          content: $content
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
          updatedBy {
            _id
          }
          createdAt
          updatedAt
        }
      }`;
      const data = {
        query,
        variables: {
          id: node._id,
          dataType: "URL",
          title: "Now it's a URL",
          content: "https://www.udia.ca"
        }
      };
      const response = await client.post("/graphql", data, {
        headers: { authorization: jwt }
      });
      expect(response.status).toBe(200);
      expect(response.data.data.updateNode._id).toEqual("" + node._id);
      expect(response.data.data.updateNode.children).toEqual([]);
      expect(response.data.data.updateNode.content).toEqual(
        "https://www.udia.ca"
      );
      expect(response.data.data.updateNode.createdAt).toBeDefined();
      expect(response.data.data.updateNode.updatedAt).toBeDefined();
      expect(response.data.data.updateNode.createdAt).toBeLessThan(
        response.data.data.updateNode.updatedAt
      );
      expect(response.data.data.updateNode.createdBy).toEqual({
        _id: "" + user._id
      });
      expect(response.data.data.updateNode.updatedBy).toEqual({
        _id: "" + user._id
      });
      expect(response.data.data.updateNode.dataType).toEqual("URL");
      expect(response.data.data.updateNode.parent).toBeNull();
      expect(response.data.data.updateNode.relationType).toEqual("POST");
      done();
    });

    it("should validly delete a node", async done => {
      const user = await testHelper.createTestUser({
        username: "creator",
        email: "creator@test.com"
      });
      const node = await testHelper.generateTestNode({
        createdBy: user,
        title: "Newly Created Node",
        content: "This is my new node"
      });
      const jwt = await testHelper.getJWT({ email: "creator@test.com" });
      const query = `
      mutation deleteNode($id: ID!) {
        deleteNode(id: $id) {
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
          updatedBy {
            _id
          }
          createdAt
          updatedAt
        }
      }`;
      const data = { query, variables: { id: node._id } };
      const response = await client.post("/graphql", data, {
        headers: { authorization: jwt }
      });
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        data: {
          deleteNode: {
            _id: "" + node._id,
            children: [],
            content: null,
            createdAt: null,
            createdBy: null,
            dataType: "TEXT",
            parent: null,
            relationType: "POST",
            title: null,
            updatedAt: null,
            updatedBy: null
          }
        }
      });
      done();
    });

    it("should validly create a user", async done => {
      const query = `
      mutation createUser(
        $email: String!,
        $username: String!,
        $password: String!
      ) {
        createUser(email: $email, username: $username, password: $password) {
          token
          user {
            _id
            username
            createdNodes {
              _id
            }
            createdAt
            updatedAt
            email
            passwordHash
          }
        }
      }`;
      const data = {
        query,
        variables: {
          email: "testEmail@bar.baz",
          username: "resolverTest",
          password: "Secret123"
        }
      };
      const userResponse = await client.post("/graphql", data);
      expect(userResponse.status).toBe(200);
      expect(userResponse.data.data.createUser).toHaveProperty("token");
      expect(userResponse.data.data.createUser.user).toHaveProperty("_id");
      expect(userResponse.data.data.createUser.user).toHaveProperty(
        "createdAt"
      );
      expect(userResponse.data.data.createUser.user).toHaveProperty(
        "email",
        "testEmail@bar.baz"
      );
      expect(userResponse.data.data.createUser.user).toHaveProperty(
        "createdNodes",
        []
      );
      expect(userResponse.data.data.createUser.user).toHaveProperty(
        "passwordHash"
      );
      expect(userResponse.data.data.createUser.user).toHaveProperty(
        "updatedAt"
      );
      expect(userResponse.data.data.createUser.user).toHaveProperty(
        "username",
        "resolverTest"
      );
      done();
    });

    it("should validly sign in a user", async done => {
      const query = `
      mutation signinUser($email: String!, $password: String!) {
        signinUser(email: { email: $email, password: $password }) {
          token
          user {
            _id
            username
            createdNodes {
              _id
            }
            createdAt
            updatedAt
            email
            passwordHash
          }
        }
      }
      `;
      const data = {
        query,
        variables: {
          email: "testEmail@bar.baz",
          password: "Secret123"
        }
      };
      await testHelper.createTestUser({
        username: "resolverTest",
        email: "testEmail@bar.baz",
        rawPassword: "Secret123"
      });
      const userResponse = await client.post("/graphql", data);
      expect(userResponse.status).toBe(200);
      expect(userResponse.data.data.signinUser).toHaveProperty("token");
      expect(userResponse.data.data.signinUser.user).toHaveProperty("_id");
      expect(userResponse.data.data.signinUser.user).toHaveProperty(
        "createdAt"
      );
      expect(userResponse.data.data.signinUser.user).toHaveProperty(
        "email",
        "testEmail@bar.baz"
      );
      expect(userResponse.data.data.signinUser.user).toHaveProperty(
        "createdNodes",
        []
      );
      expect(userResponse.data.data.signinUser.user).toHaveProperty(
        "passwordHash"
      );
      expect(userResponse.data.data.signinUser.user).toHaveProperty(
        "updatedAt"
      );
      expect(userResponse.data.data.signinUser.user).toHaveProperty(
        "username",
        "resolverTest"
      );
      done();
    });
  });
});
