const createUser = async (root, data, { mongo: { Users } }) => {
  const newUser = {
    name: data.name,
    email: data.authProvider.email.email,
    password: data.authProvider.email.password
  };
  const response = await Users.insert(newUser);
  return Object.assign({ id: response.insertedIds[0] }, newUser);
};

module.exports = createUser;
