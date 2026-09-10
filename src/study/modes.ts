export const STUDY_MODES = ['image', 'name', 'quiz'] as const
export type StudyMode = (typeof STUDY_MODES)[number]

export const MODE_INFO: Record<StudyMode, { label: string; short: string; description: string; key: string }> = {
  image: {
    label: 'Image → nom + effet',
    short: 'Image',
    description: "Reconnaître la carte à partir de son illustration : nom, coût, effet.",
    key: 'I',
  },
  name: {
    label: 'Nom → effet + coût',
    short: 'Nom',
    description: 'Réciter le coût et le texte de la carte à partir de son nom.',
    key: 'N',
  },
  quiz: {
    label: 'Quiz à choix multiples',
    short: 'Quiz',
    description: 'Questions générées automatiquement : coût, domaine, effet.',
    key: 'Q',
  },
}
