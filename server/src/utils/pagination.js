export function getPagination(req) {
  const pageParam = req.query.page;
  const limitParam = req.query.limit;
  if (pageParam === undefined && limitParam === undefined) return null;

  const page = Number(pageParam || 1);
  const limit = Number(limitParam || 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    const error = new Error("page and limit must be positive integers");
    error.status = 400;
    throw error;
  }

  const cappedLimit = Math.min(limit, 100);
  return {
    page,
    limit: cappedLimit,
    from: (page - 1) * cappedLimit,
    to: page * cappedLimit - 1
  };
}

export function formatPaginatedResponse(data, total, pagination) {
  const safeTotal = Number(total || 0);
  return {
    data: data || [],
    total: safeTotal,
    page: pagination.page,
    limit: pagination.limit,
    hasMore: pagination.page * pagination.limit < safeTotal
  };
}
