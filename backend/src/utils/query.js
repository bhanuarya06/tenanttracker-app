const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const paginate = async (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit),
    query.model.countDocuments(query.getFilter()),
  ]);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

const buildSort = (sortBy) => {
  if (!sortBy) return { createdAt: -1 };
  const sort = {};
  sortBy.split(',').forEach((field) => {
    if (field.startsWith('-')) {
      sort[field.substring(1)] = -1;
    } else {
      sort[field] = 1;
    }
  });
  return sort;
};

const buildFilter = (queryParams, allowedFilters = []) => {
  const filter = {};
  allowedFilters.forEach((key) => {
    if (queryParams[key] !== undefined && queryParams[key] !== '') {
      filter[key] = queryParams[key];
    }
  });
  if (queryParams.search) {
    const searchFields = queryParams.searchFields
      ? queryParams.searchFields.split(',')
      : ['name'];
    const regex = new RegExp(queryParams.search, 'i');
    filter.$or = searchFields.map((f) => ({ [f]: regex }));
  }
  return filter;
};

module.exports = { paginate, buildSort, buildFilter, escapeRegex };
