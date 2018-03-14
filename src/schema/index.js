"use strict";

const { makeExecutableSchema } = require("graphql-tools");
const resolvers = require("./resolvers");

// Define types here
const typeDefs = `
  ${"" /* Nodes */}

  type Node @model {
    _id: ID! @isUnique
    dataType: NodeDataType!
    relationType: NodeRelationType!
    title: String
    content: String
    parent: Node @relation(name: "NodeParent")
    children: [Node!]! @relation(name: "NodeChildren")
    createdBy: User @relation(name: "UserCreatedNodes")
    updatedBy: User @relation(name: "UserUpdatedNodes")
    createdAt: DateTime
    updatedAt: DateTime
    countImmediateChildren: Int!
    countAllChildren: Int!
  }

  enum NodeDataType {
    DELETED
    TEXT
    URL
  }

  enum NodeRelationType {
    POST
    COMMENT
  }
  
  input NodeFilter {
    OR: [NodeFilter!]
    id: ID
    id_in: [ID!]
    parent: ID
    createdBy: ID
    title_contains: String
    content_contains: String
    createdAt_lt: DateTime
    createdAt_lte: DateTime
    createdAt_gt: DateTime
    createdAt_gte: DateTime
    updatedAt_lt: DateTime
    updatedAt_lte: DateTime
    updatedAt_gt: DateTime
    updatedAt_gte: DateTime
  }

  enum NodeOrderBy {
    createdAt_ASC
    createdAt_DESC
    updatedAt_ASC
    updatedAt_DESC
  }

  ${"" /* Users */}
 
  type User @model {
    _id: ID! @isUnique
    username: String! @isUnique
    createdNodes: [Node!] @relation(name: "UserCreatedNodes")
    updatedNodes: [Node!] @relation(name: "UserUpdatedNodes")
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FullUser @model {
    _id: ID! @isUnique
    username: String! @isUnique
    createdNodes: [Node!] @relation(name: "UserCreatedNodes")
    updatedNodes: [Node!] @relation(name: "UserUpdatedNodes")
    createdAt: DateTime!
    updatedAt: DateTime!
    email: String! @isUnique
    emailVerified: Boolean!
    passwordHash: String!
  }

  ${"" /* Queries */}  

  type Query {
    allNodes(
      filter: NodeFilter,
      orderBy: NodeOrderBy,
      skip: Int,
      first: Int
    ): [Node!]!
    me: FullUser
    healthMetric: HealthMetric
  }

  ${"" /* Mutations */}  

  type Mutation {
    createNode(
      dataType: NodeDataType!,
      relationType: NodeRelationType!,
      title: String,
      content: String!,
      parentId: ID
    ): Node!
    updateNode(
      id: ID!,
      dataType: NodeDataType,
      title: String,
      content: String
    ): Node!
    deleteNode(id: ID!): Node!
    createUser(
      email: String!
      username: String!,
      password: String!
    ): SigninPayload!
    signinUser(email: AUTH_PROVIDER_EMAIL): SigninPayload!
    forgotPassword(email: String!): Boolean!
    generateNewPassword(token: String!, password: String!): SigninPayload!
    updatePassword(password: String!): FullUser!
    resendConfirmationEmail: Boolean!
    confirmEmail(token: String!): Boolean!
    changeEmail(email: String!): FullUser!
  }

  type SigninPayload {
    token: String!
    user: FullUser!
  }

  input AuthProviderSignupData {
    email: AUTH_PROVIDER_EMAIL!
  }

  input AUTH_PROVIDER_EMAIL {
    email: String!
    password: String!
  }

  ${"" /* Subscriptions */}

  type Subscription {
    NodeSubscription(filter: NodeSubscriptionFilter): NodeSubscriptionPayload
    UserSubscription: UserSubscriptionPayload
    HealthMetricSubscription: HealthMetric
  }
  
  input NodeSubscriptionFilter {
    mutation_in: [ModelMutationType!]
    parentId: ID
  }

  type NodeSubscriptionPayload {
    mutation: ModelMutationType!
    node: Node!
  }
  
  type UserSubscriptionPayload {
    user: FullUser!
  }

  enum ModelMutationType {
    CREATED,
    UPDATED
  }

  ${"" /* Misc. Metrics */}

  type HealthMetric {
    version: String!
    node_version: String!
    arch: String!
    hostname: String!
    platform: String!
    release: String!
    endianness: String!
    freemem_GiB: Float!
    totalmem_GiB: Float!
    freemem_GB: Float!
    totalmem_GB: Float!
    os_uptime: Int!
    p_uptime: Int!
    now: DateTime!
    loadavg: [Float]!
    cpus: [Cpu]!
  }

  type Cpu {
    model: String!
    speed: Int!
    times: CpuTime!
  }

  type CpuTime {
    user: Int!
    nice: Int!
    sys: Int!
    idle: Int!
    irq: Int!
  }

  scalar DateTime
`;

// Generate the schema object from types definition
module.exports = makeExecutableSchema({ typeDefs, resolvers });
