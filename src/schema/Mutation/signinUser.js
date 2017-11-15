const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../constants");

const signinUser = async (root, data, { mongo: { Users } }) => {
  const user = await Users.findOne({ email: data.email.email });
  const signinSuccessful = await bcrypt.compare(data.email.password, user.password);
  if (signinSuccessful) {
    const token = jwt.sign({id: user._id.toString()}, JWT_SECRET, {
      expiresIn: "2 days",
      notBefore: "0"
    });
    return { token, user };
  }
}

module.exports = signinUser;
