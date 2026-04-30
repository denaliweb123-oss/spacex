export const applyLimitOffset = ({
  data,
  limit,
  offset,
}: {
  data: any[];
  limit?: number | null;
  offset?: number | null;
}) => {
  const finalLimit = limit ?? data.length;
  const finalOffset = offset ?? 0;

  if (!Number.isInteger(finalLimit) || finalLimit < 0) {
    throw new Error("Limit must be a non-negative integer");
  }

  if (!Number.isInteger(finalOffset) || finalOffset < 0) {
    throw new Error("Offset must be a non-negative integer");
  }

  const endIndex = finalLimit + finalOffset;

  return data.slice(finalOffset, endIndex);
};
