export function logSupabaseError(context, error) {
  const detailCause = error?.details?.match(/Caused by:\s*([^:\n]+):\s*([^\n]+)/);
  const causeText = error?.cause?.message || detailCause?.[2] || "";
  const causeCode = error?.cause?.code
    || causeText.match(/\(([A-Z][A-Z0-9_]+)\)/)?.[1]
    || causeText.match(/\b(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT)\b/)?.[1];
  const hostnameFromCause = error?.cause?.hostname
    || causeText.match(/(?:ENOTFOUND|EAI_AGAIN|ECONNREFUSED)\s+([^\s)]+)/)?.[1];
  let hostname = hostnameFromCause;
  if (!hostname && process.env.SUPABASE_URL) {
    try {
      hostname = new URL(process.env.SUPABASE_URL).hostname;
    } catch {
      hostname = undefined;
    }
  }

  console.error(context, {
    errorName: error?.name,
    errorCode: error?.code || causeCode,
    httpStatus: error?.status,
    causeName: error?.cause?.name || detailCause?.[1],
    causeCode,
    hostname
  });
}
