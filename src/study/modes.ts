export const STUDY_MODES = ['image', 'name', 'quiz'] as const
export type StudyMode = (typeof STUDY_MODES)[number]

// Labels and descriptions live in the i18n dictionaries: `mode.<mode>.label|short|description`.
