const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./constants");
const { ObjectID } = require('mongodb');


const authenticate = async ({ headers: { authorization } }, Users) => {
  const token = authorization || "";
  const tokenPayload = jwt.verify(token, JWT_SECRET);
  // I suppose this could be avoided if we encode user in the JWT
  // but I want to eventually store banned state, hold actual sessions, etc.
  const user = await Users.findOne({_id: new ObjectID(tokenPayload.id)});
  return user;
}

module.exports = {
  authenticate
};
