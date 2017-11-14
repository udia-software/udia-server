const createVote = async (root, data, { mongo: { Votes }, user }) => {
  const newVote = {
    userId: user && user._id,
    linkId: new ObjectID(data.linkId)
  };
  const response = await Votes.insert(newVote);
  return Object.assign({ id: response.insertedIds[0] }, newVote);
};

module.exports = createVote;
