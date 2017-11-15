
function buildFilters({ OR = [], description_contains, url_contains }) {
  const filter = description_contains || url_contains ? {} : null;
  if (description_contains) {
    filter.description = { $regex: `.*${description_contains}.*` };
  }
  if (url_contains) {
    filter.url = { $regex: `.*${url_contains}.*` };
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildFilters(OR[i]));
  }
  return filters;
}

const allLinks = async (root, { filter, skip, first }, { mongo: { Links } }) => {
  let query = filter ? { $or: buildFilters(filter) } : {};
  const cursor = Links.find(query);
  if (first) {
    cursor.limit(first);
  }
  if (skip) {
    cursor.skip(skip);
  }
  return await cursor.toArray();
};

module.exports = allLinks;
