const bcrypt = require("bcrypt");

const signinUser = async (root, data, { mongo: { Users } }) => {
  const user = await Users.findOne({ email: data.email.email });
  const signinSuccessful = await bcrypt.compare(data.email.password, user.password);
  if (signinSuccessful) {
    return { token: `token-${user.email}`, user };
  }
}

module.exports = signinUser;
