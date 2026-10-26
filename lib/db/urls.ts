/** Neon direct host: the pooled host with "-pooler" removed. Use for migrations and DDL. */
export function toDirectUrl(pooledUrl: string): string {
  return pooledUrl.replace('-pooler', '');
}
