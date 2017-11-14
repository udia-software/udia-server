const signinUser = async (root, data, { mongo: { Users } }) => {
  const user = await Users.findOne({ email: data.email.email });
  if (data.email.password === user.password) {
    return { token: `token-${user.email}`, user };
  }
}

module.exports = signinUser;
