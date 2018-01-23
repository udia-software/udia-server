"use strict";

const { ApolloClient } = require("apollo-client");
const { InMemoryCache } = require("apollo-cache-inmemory");
const { ApolloLink } = require("apollo-link");
const { createHttpLink } = require("apollo-link-http");
const gql = require("graphql-tag");
const fetch = require("node-fetch");
const { SubscriptionClient } = require("subscriptions-transport-ws");
const WebSocket = require("ws");

const start = require("../../src/index");
const testHelper = require("../testhelper");
const { PORT } = require("../../src/constants");

const GRAPHQL_SUBSCRIPTIONS_ENDPOINT = `ws://localhost:${PORT}/subscriptions`;
const GRAPHQL_HTTP_ENDPOINT = `http://localhost:${PORT}/graphql`;

let server = null;
let networkInterface = null;
let client = null;
let resolverUser = null;
let jwt = null;

beforeAll(async done => {
  await testHelper.initializeTestState();
  resolverUser = await testHelper.createTestUser({
    username: "subscriber",
    rawPassword: "supersecret123",
    email: "subscription@test.com"
  });
  jwt = await testHelper.getJWT({
    rawPassword: "supersecret123",
    email: "subscription@test.com"
  });

  server = await start();
  networkInterface = new SubscriptionClient(
    GRAPHQL_SUBSCRIPTIONS_ENDPOINT,
    { reconnect: true, connectionParams: { authToken: jwt } },
    WebSocket
  );

  const httpLink = createHttpLink({ uri: GRAPHQL_HTTP_ENDPOINT, fetch });
  const middlewareLink = new ApolloLink((operation, forward) => {
    operation.setContext({ headers: { authorization: jwt } });
    return forward(operation);
  });
  const link = middlewareLink.concat(httpLink);

  client = new ApolloClient({
    networkInterface,
    link,
    cache: new InMemoryCache()
  });
  done();
});

afterAll(async done => {
  await networkInterface.close();
  await server.close();
  await testHelper.tearDownTestState(true);
  done();
});

describe("Subscriptions", () => {
  it("should subscribe to node creations");
  // it("should subscribe to node creations", async done => {
  //   const nodeSubscriptionPromise = new Promise((resolve, reject) => {
  //     client
  //       .subscribe({
  //         query: gql`
  //           subscription NodeSubcription {
  //             NodeSubscription(filter: { mutation_in: [CREATED] }) {
  //               mutation
  //               node {
  //                 title
  //               }
  //             }
  //           }
  //         `
  //       })
  //       .subscribe({
  //         next: resolve,
  //         error: reject
  //       });
  //   });

  //   const mutationResponse = await client.mutate({
  //     mutation: gql`
  //       mutation createNode(
  //         $dataType: NodeDataType!
  //         $relationType: NodeRelationType!
  //         $title: String!
  //         $content: String!
  //         $parentId: ID
  //       ) {
  //         createNode(
  //           dataType: $dataType
  //           relationType: $relationType
  //           title: $title
  //           content: $content
  //           parentId: $parentId
  //         ) {
  //           dataType
  //           relationType
  //           title
  //           content
  //           parent {
  //             _id
  //           }
  //           children {
  //             _id
  //           }
  //           createdBy {
  //             _id
  //           }
  //           updatedBy {
  //             _id
  //           }
  //         }
  //       }
  //     `,
  //     variables: {
  //       dataType: "TEXT",
  //       relationType: "POST",
  //       title: "Test Create Node Resolver",
  //       content: "Test Create Node Resolver Content String!"
  //     }
  //   });

  //   expect(mutationResponse).toEqual({
  //     data: {
  //       createNode: {
  //         __typename: "Node",
  //         children: [],
  //         content: "Test Create Node Resolver Content String!",
  //         createdBy: { __typename: "User", _id: "" + resolverUser._id },
  //         dataType: "TEXT",
  //         parent: null,
  //         relationType: "POST",
  //         title: "Test Create Node Resolver",
  //         updatedBy: { __typename: "User", _id: "" + resolverUser._id }
  //       }
  //     }
  //   });

  //   // ASSERT SUBSCRIPTION RECEIVED EVENT
  //   let subscriptionResult = await nodeSubscriptionPromise;
  //   expect(subscriptionResult).toEqual({
  //     data: {
  //       NodeSubscription: {
  //         mutation: "CREATED",
  //         node: {
  //           title: "Test Create Node Resolver"
  //         }
  //       }
  //     }
  //   });
  //   done();
  // });
});
