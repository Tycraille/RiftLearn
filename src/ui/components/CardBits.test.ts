import { describe, expect, it } from 'vitest'
import { textLines } from './CardBits'

describe('textLines', () => {
  it('splits HTML on <br /> and <p>', () => {
    expect(textLines('<p>(Units with 0 :rb_might: can conquer.)<br />When you play me, draw 1.<br />[Deathknell][>] Choose.</p>')).toEqual([
      '(Units with 0 :rb_might: can conquer.)',
      'When you play me, draw 1.',
      '[Deathknell][>] Choose.',
    ])
  })
  it('falls back to a heuristic on plain text', () => {
    expect(textLines('[Reaction] (Play any time.)Counter a spell.')).toEqual(['[Reaction] (Play any time.)', 'Counter a spell.'])
  })
})
