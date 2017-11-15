const DataLoader = require("dataloader");

const batchUsers = async (Users, keys) => {
  return await Users.find({ _id: { $in: keys } }).toArray();
};

module.exports = ({ Users }) => ({
  userLoader: new DataLoader(keys => batchUsers(Users, keys), {
    cacheKeyFn: key => key.toString()
  })
});
