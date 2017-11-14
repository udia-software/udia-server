const { URL } = require("url");
const pubsub = require("../../pubsub");

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

function assertValidLink({ url }) {
  try {
    new URL(url);
  } catch (error) {
    throw new ValidationError("Link validation error: invalid url.", "url");
  }
}

const createLink = async (root, data, { mongo: { Links }, user }) => {
  assertValidLink(data);
  const newLink = Object.assign({ postedById: user && user._id }, data);
  const response = await Links.insert(newLink);

  newLink.id = response.insertedIds[0];
  pubsub.publish("Link", { Link: { mutation: "CREATED", node: newLink } });

  return newLink;
};

module.exports = createLink;
