import { describe, expect, it } from 'vitest'
import { activeFilterCount } from './cardFilters'

const initial = { domain: '', type: '', set: '', metaOnly: true }

describe('activeFilterCount', () => {
  it('is 0 with the initial filters', () => {
    expect(activeFilterCount(initial)).toBe(0)
  })
  it('counts domain, type and set each as one', () => {
    expect(activeFilterCount({ ...initial, domain: 'Fury' })).toBe(1)
    expect(activeFilterCount({ ...initial, domain: 'Fury', type: 'Unit', set: 'OGN' })).toBe(3)
  })
  it('counts the meta-only box when unchecked', () => {
    expect(activeFilterCount({ ...initial, metaOnly: false })).toBe(1)
    expect(activeFilterCount({ ...initial, domain: 'Fury', metaOnly: false })).toBe(2)
    expect(activeFilterCount({ domain: 'Fury', type: 'Unit', set: 'OGN', metaOnly: false })).toBe(4)
  })
})
