import { describe, expect, it } from 'vitest'
import { textLines } from './CardBits'

describe('textLines', () => {
  it('découpe le HTML sur <br /> et <p>', () => {
    expect(textLines('<p>(Units with 0 :rb_might: can conquer.)<br />When you play me, draw 1.<br />[Deathknell][>] Choose.</p>')).toEqual([
      '(Units with 0 :rb_might: can conquer.)',
      'When you play me, draw 1.',
      '[Deathknell][>] Choose.',
    ])
  })
  it('repli heuristique sur le texte brut', () => {
    expect(textLines('[Reaction] (Play any time.)Counter a spell.')).toEqual(['[Reaction] (Play any time.)', 'Counter a spell.'])
  })
})
