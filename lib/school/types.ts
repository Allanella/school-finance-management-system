export const schoolTypes = ['primary', 'secondary', 'combined', 'other'] as const

export type SchoolType = (typeof schoolTypes)[number]

export const schoolTypeLabels: Record<SchoolType, string> = {
  primary: 'Primary school',
  secondary: 'Secondary school',
  combined: 'Primary and secondary',
  other: 'Other school type',
}

export const educationStages = [
  'early_childhood',
  'primary',
  'lower_secondary',
  'upper_secondary',
  'tertiary',
  'custom',
] as const

export type EducationStage = (typeof educationStages)[number]

export const educationStageLabels: Record<EducationStage, string> = {
  early_childhood: 'Early childhood',
  primary: 'Primary',
  lower_secondary: 'Lower secondary',
  upper_secondary: 'Upper secondary',
  tertiary: 'Tertiary',
  custom: 'Custom',
}

export function getSchoolTypeLabel(value: string) {
  return schoolTypeLabels[value as SchoolType] ?? schoolTypeLabels.other
}
