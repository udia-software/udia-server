const { makeExecutableSchema } = require("graphql-tools");
const resolvers = require("./resolvers");

// Define types here
const typeDefs = `
  type Node @model {
    _id: ID! @isUnique
    type: NodeType!
    title: String!
    content: String!
    inputLinks: [Link!]! @relation(name: "NodeInLinks")
    output: [Link!]! @relation(name: "NodeOutLinks")
    createdBy: User! @relation(name: "UserNodes")
    votes: [Vote!]! @relation(name: "NodeVotes")
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum NodeType {
    TEXT
    URL
  }
  
  input NodeFilter {
    OR: [NodeFilter!]
    id: ID
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

  type Link @model {
    _id: ID! @isUnique
    type: LinkType!
    createdBy: User! @relation(name: "UserLinks")
    source: Node! @relation(name: "NodeOutLinks")
    dest: Node! @relation(name: "NodeInLinks")
  }

  enum LinkType {
    COMMENT
    POST
  }

  type Vote @model {
    _id: ID! @isUnique
    type: VoteType!
    user: User! @relation(name: "UserVotes")
    node: Node! @relation(name: "NodeVotes")
  }

  enum VoteType {
    UP
    DOWN
  }

  type User @model {
    _id: ID! @isUnique
    email: String @isUnique
    name: String!
    votes: [Vote!]! @relation(name: "UserVotes")
    nodes: [Node!]! @relation(name: "UserNodes")
    links: [Link!]! @relation(name: "UserLinks")
    createdAt: DateTime!
    updatedAt: DateTime!
    passwordHash: String
  }

  type Query {
    allNodes(
      filter: NodeFilter,
      orderBy: NodeOrderBy,
      skip: Int,
      first: Int
    ): [Node!]!
  }

  type Mutation {
    createNode(type: NodeType!, title: String!, content: String!, inputLinkIds: [ID!]): Node!
    createVote(type: VoteType!, nodeId: ID!): Vote!
    createUser(name: String!, authProvider: AuthProviderSignupData!): User!
    signinUser(email: AUTH_PROVIDER_EMAIL): SigninPayload!
  }

  type SigninPayload {
    token: String!
    user: User!
  }

  input AuthProviderSignupData {
    email: AUTH_PROVIDER_EMAIL!
  }

  input AUTH_PROVIDER_EMAIL {
    email: String!
    password: String!
  }

  type Subscription {
    Node(filter: NodeSubscriptionFilter): NodeSubscriptionPayload
    Link(filter: LinkSubscriptionFilter): LinkSubscriptionPayload
  }
  
  input NodeSubscriptionFilter {
    mutation_in: [ModelMutationType!]
  }

  type NodeSubscriptionPayload {
    mutation: ModelMutationType!
    payload: Node!
  }

  input LinkSubscriptionFilter {
    mutation_in: [ModelMutationType!]
  }
  
  type LinkSubscriptionPayload {
    mutation: ModelMutationType!
    payload: Link!
  }
  
  enum ModelMutationType {
    CREATED
    UPDATED
    DELETED
  }

  scalar DateTime
`;

// Generate the schema object from types definition
module.exports = makeExecutableSchema({ typeDefs, resolvers });
