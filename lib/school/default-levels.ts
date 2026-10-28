import type { SchoolType } from './types'

export function getDefaultEducationLevels(schoolType: SchoolType) {
  const levels: Array<{ name: string; stage: string; sequence_index: number }> = []

  if (schoolType === 'primary' || schoolType === 'combined') {
    for (let index = 1; index <= 7; index += 1) {
      levels.push({ name: `P.${index}`, stage: 'primary', sequence_index: index })
    }
  }

  if (schoolType === 'secondary' || schoolType === 'combined') {
    for (let index = 1; index <= 6; index += 1) {
      levels.push({
        name: `S.${index}`,
        stage: index <= 4 ? 'lower_secondary' : 'upper_secondary',
        sequence_index: index + (schoolType === 'combined' ? 7 : 0),
      })
    }
  }

  return levels
}
