const { makeExecutableSchema } = require("graphql-tools");
const resolvers = require("./resolvers");

// Define types here
const typeDefs = `
  type Link {
    id: ID!
    url: String!
    description: String!
    postedBy: User
    votes: [Vote!]!
  }

  type Vote {
    id: ID!
    user: User!
    link: Link!
  }

  type Query {
    allLinks(filter: LinkFilter, skip: Int, first: Int): [Link!]!
  }

  type Mutation {
    createLink(url: String!, description: String!): Link
    createVote(linkId: ID!): Vote
    createUser(name: String!, authProvider: AuthProviderSignupData!): User
    signinUser(email: AUTH_PROVIDER_EMAIL): SigninPayload!
  }

  type SigninPayload {
    token: String
    user: User
  }

  type User {
    id: ID!
    name: String!
    email: String
    password: String
    votes: [Vote!]!
  }

  input AuthProviderSignupData {
    email: AUTH_PROVIDER_EMAIL
  }

  input LinkFilter {
    OR: [LinkFilter!]
    description_contains: String
    url_contains: String
  }

  input AUTH_PROVIDER_EMAIL {
    email: String!
    password: String!
  }

  type Subscription {
    Link(filter: LinkSubscriptionFilter): LinkSubscriptionPayload
  }
  
  input LinkSubscriptionFilter {
    mutation_in: [_ModelMutationType!]
  }
  
  type LinkSubscriptionPayload {
    mutation: _ModelMutationType!
    node: Link
  }
  
  enum _ModelMutationType {
    CREATED
    UPDATED
    DELETED
  }
`;

// Generate the schema object from types definition
module.exports = makeExecutableSchema({ typeDefs, resolvers });
