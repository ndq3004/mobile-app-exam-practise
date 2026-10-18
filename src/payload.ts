// Next.js serves the first page as HTML with its original JSON in this script.
export function responseJson(body: string, document: boolean): string | undefined {
  const raw = document ? body.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i)?.[1] : body;
  if (!raw) return;
  try { JSON.parse(raw); return raw; } catch { return; }
}
export function payloadPageUrl(payload: any, fallback: string): string {
  const props = payload?.props?.pageProps ?? payload?.pageProps;
  const examId = props?.exam?.id;
  const page = props?.currentPage;
  const url = new URL(fallback);
  if (url.hostname.replace(/^www\./,'') === 'examprepper.co' && /^\d+$/.test(String(examId)) && Number.isInteger(page) && page > 0) {
    url.pathname = `/exam/${examId}/${page}`; url.search = ''; url.hash = '';
  }
  return url.href;
}
