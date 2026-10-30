/**
 * The facts the pages print. Anything in square brackets is a placeholder still to be filled;
 * `scripts/check-dist.mjs` warns while one is left in the build.
 */
export const site = {
  name: 'Toms Zvirbulis',
  url: 'https://tomszir.com',
  description:
    'Toms Zvirbulis, software developer in Latvia. Building Team Up and Zvirb, and writing about how software is made.',
  email: 'tomszir@proton.me',
  github: 'https://github.com/tomszir',
  timeZone: 'Europe/Riga',
  place: 'Latvia',
  facts: [
    { label: 'Role', value: 'Software developer' },
    { label: 'Based in', value: 'Latvia' },
    { label: 'Writing code', value: 'Since age 10' },
    { label: 'Professionally', value: '5 years' },
    { label: 'Employed at', value: 'SIA DevLead' },
    { label: 'Part-owner', value: 'SIA EventFlow' },
  ],
  experience: [
    { company: 'SIA DevLead', role: 'Developer', years: '2022-present' },
    { company: 'SIA EventFlow', role: 'Part-owner, full-stack developer', years: '2024-present' },
  ],
  skills: [
    { label: 'Languages', value: 'TypeScript, Go, Rust, Java, Kotlin, Python' },
    { label: 'Web', value: 'React, Spring Boot' },
    { label: 'Since', value: 'Professional of 5 years, hobbyist since forever.' },
  ],
} as const
