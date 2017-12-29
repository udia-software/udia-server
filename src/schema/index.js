const { makeExecutableSchema } = require("graphql-tools");
const resolvers = require("./resolvers");

// Define types here
const typeDefs = `
  ${"" /* Nodes */}

  type Node @model {
    _id: ID! @isUnique
    dataType: NodeDataType!
    relationType: NodeRelationType!
    title: String!
    content: String!
    parent: Node @relation(name: "NodeParent")
    children: [Node!]! @relation(name: "NodeChildren")
    createdBy: User! @relation(name: "UserNodes")
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum NodeDataType {
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
    parent: ID
    children_contains: [ID!]
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
    nodes: [Node!]! @relation(name: "UserNodes")
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FullUser @model {
    _id: ID! @isUnique
    username: String! @isUnique
    nodes: [Node!]! @relation(name: "UserNodes")
    createdAt: DateTime!
    updatedAt: DateTime!
    email: String! @isUnique
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
  }

  ${"" /* Mutations */}  

  type Mutation {
    createNode(
      dataType: NodeDataType!,
      relationType: NodeRelationType!,
      title: String!,
      content: String!,
      parentId: ID
    ): Node!
    createUser(
      email: String!
      username: String!,
      password: String!
    ): SigninPayload!
    signinUser(email: AUTH_PROVIDER_EMAIL): SigninPayload!
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
    Node(filter: NodeSubscriptionFilter): NodeSubscriptionPayload
  }
  
  input NodeSubscriptionFilter {
    mutation_in: [ModelMutationType!]
  }

  type NodeSubscriptionPayload {
    mutation: ModelMutationType!
    payload: Node!
  }
  
  enum ModelMutationType {
    CREATED
  }

  scalar DateTime
`;

// Generate the schema object from types definition
module.exports = makeExecutableSchema({ typeDefs, resolvers });
