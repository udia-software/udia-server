
const JWT_SECRET = process.env.JWT_SECRET || "UDIA Development JWT Secret Key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/udia";
const SALT_ROUNDS = 12;


module.exports = {
  JWT_SECRET,
  MONGO_URI,
  SALT_ROUNDS
}