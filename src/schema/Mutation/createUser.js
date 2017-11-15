const bcrypt = require("bcrypt");
const { SALT_ROUNDS } = require("../../constants");

const createUser = async (root, data, { mongo: { Users } }) => {
  const newUser = {
    name: data.name,
    email: data.authProvider.email.email
  };
  const password = data.authProvider.email.password;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  newUser.password = passwordHash;
  const response = await Users.insert(newUser);
  return Object.assign({ id: response.insertedIds[0] }, newUser);
};

module.exports = createUser;
