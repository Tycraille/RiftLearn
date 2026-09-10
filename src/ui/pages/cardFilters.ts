/** Card browser filters that narrow the list (sort and search text are not filters). */
export interface CardFilters {
  domain: string
  type: string
  set: string
  metaOnly: boolean
}

/** Number of filters that differ from their initial value: any domain/type/set, and meta-only unchecked. */
export function activeFilterCount(f: CardFilters): number {
  return [f.domain !== '', f.type !== '', f.set !== '', !f.metaOnly].filter(Boolean).length
}
