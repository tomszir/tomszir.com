import type { Text } from './i18n'

/**
 * The facts the pages print, in both languages where they're words rather than names. Anything in
 * square brackets is a placeholder still to be filled; `scripts/check-dist.mjs` warns while one is
 * left in the build.
 */
export const site = {
  name: 'Toms Zvirbulis',
  url: 'https://tomszir.com',
  description: {
    en: 'Toms Zvirbulis, software developer in Latvia. Building Team Up and Zvirb, and writing about how software is made.',
    lv: 'Toms Zvirbulis, programmatūras izstrādātājs Latvijā. Veido Team Up un Zvirb un raksta par to, kā top programmatūra.',
  } satisfies Text,
  role: { en: 'Software developer', lv: 'Programmatūras izstrādātājs' } satisfies Text,
  email: 'tomszir@proton.me',
  github: 'https://github.com/tomszir',
  /** This site's repository; the build links its commit stamps to commits here. */
  source: 'https://github.com/tomszir/tomszir.com',
  timeZone: 'Europe/Riga',
  place: { en: 'Latvia', lv: 'Latvija' } satisfies Text,
  /**
   * Whether Toms is looking for work. While `open`, the home page, the CV, their cards and the
   * JSON-LD say so; turned off, none of it renders.
   */
  availability: {
    open: true,
    roles: {
      en: 'Full-stack, frontend or backend developer',
      lv: 'Full-stack, frontend vai backend izstrādātājs',
    } satisfies Text,
    where: { en: 'Riga, hybrid or remote', lv: 'Rīgā, hibrīdi vai attālināti' } satisfies Text,
    from: { en: '10 December 2026', lv: '2026. gada 10. decembra' } satisfies Text,
  },
  /** The line under the name on the CV. */
  headline: {
    en: 'Full-stack developer (Java, .NET, React), Riga',
    lv: 'Full-stack izstrādātājs (Java, .NET, React), Rīga',
  } satisfies Text,
  /** The one line that opens the CV. */
  summary: {
    en: "Nearly five years' experience building Latvian public-sector systems for payments, case management and registers.",
    lv: 'Gandrīz piecu gadu pieredze Latvijas valsts sektora sistēmu izstrādē maksājumiem, lietu pārvaldībai un reģistriem.',
  } satisfies Text,
  /**
   * Whether the CV names Toms's clients. Each client highlight is written both ways; while
   * `named` is off the names are not in the build at all, and `check-dist` fails if one slips in.
   */
  clients: { named: false },
  /**
   * Roles, the main job first and side projects after. A contractor's work is grouped by client; a confidential client is written
   * twice, by name and as a generic description, and `clients.named` picks one. A client given as
   * plain text is always named.
   */
  experience: [
    {
      company: 'SIA DevLead',
      role: { en: 'Developer', lv: 'Izstrādātājs' } satisfies Text,
      years: { en: '2022–present', lv: '2022–šobrīd' } satisfies Text,
      intro: {
        en: 'Software development contractor.',
        lv: 'Programmatūras izstrādes ārpakalpojumu uzņēmums.',
      } satisfies Text,
      highlights: [],
      clients: [
        {
          client: {
            named: { en: 'Rode', lv: 'Rode' },
            anonymous: { en: 'Law firm', lv: 'Advokātu birojs' },
          },
          when: '2026',
          highlights: [
            {
              en: "As sole developer, built a platform for the firm's online client meetings: sign-up with Montonio payments, email and SMS verification, invoicing, and an admin and attorney panel.",
              lv: 'Kā vienīgais izstrādātājs izveidoju platformu biroja tiešsaistes tikšanām ar klientiem: reģistrācija ar Montonio maksājumiem, e-pasta un SMS verifikācija, rēķini un administratora un advokātu panelis.',
            },
            {
              en: 'Video meetings run on LiveKit; the platform ships as a drop-in WordPress plugin with a Lit web component frontend in TypeScript.',
              lv: 'Videotikšanās darbojas ar LiveKit; platforma ir gatavs WordPress spraudnis ar Lit web komponentu saskarni TypeScript valodā.',
            },
          ] satisfies Text[],
        },
        {
          client: {
            named: { en: 'Valsts kase (State Treasury)', lv: 'Valsts kase' },
            anonymous: { en: 'Financial institution', lv: 'Finanšu iestāde' },
          },
          when: '2023–2026',
          highlights: [
            {
              en: 'As lead developer, architected and built a Verification of Payee microservice to meet the EU Instant Payments Regulation. It verifies 200,000 payees in under two minutes using a database-backed queue and auto-scaling workers.',
              lv: 'Kā vadošais izstrādātājs projektēju un izveidoju saņēmēja pārbaudes (Verification of Payee) mikroservisu atbilstoši ES Zibmaksājumu regulai. Tas pārbauda 200 000 saņēmēju mazāk nekā divās minūtēs, izmantojot datubāzē glabātu rindu un automātiski mērogojamus apstrādes procesus.',
            },
            {
              en: 'Wrote most of a new B2B payment service (Java 21, Spring Boot; ISO 20022, SOAP, Keycloak) in a team of up to three.',
              lv: 'Komandā ar līdz trim izstrādātājiem izstrādāju lielāko daļu jauna B2B maksājumu servisa (Java 21, Spring Boot; ISO 20022, SOAP, Keycloak).',
            },
            {
              en: 'Planned and implemented the Oracle to PostgreSQL migration: documented how each of over 40 tables is used, defined the new tables, wrote the SQL ETL scripts for millions of rows, verified their output and traced missing data.',
              lv: 'Plānoju un īstenoju datubāzes migrāciju no Oracle uz PostgreSQL: dokumentēju vairāk nekā 40 tabulu lietojumu, definēju jaunās tabulas, uzrakstīju SQL ETL skriptus miljoniem ierakstu, pārbaudīju to rezultātus un izsekoju trūkstošos datus.',
            },
          ] satisfies Text[],
        },
        {
          client: {
            named: { en: '[POLICE CLIENT]', lv: '[POLICE CLIENT]' },
            anonymous: { en: 'Law enforcement agency', lv: 'Tiesībaizsardzības iestāde' },
          },
          when: '2025–2026',
          highlights: [
            {
              en: 'Led the React and TypeScript frontend of a new register system in a team of five, from the start of the project, on a .NET backend, using TanStack Query and a custom MUI theme.',
              lv: 'Piecu cilvēku komandā kopš projekta sākuma vadīju jaunas reģistra sistēmas React un TypeScript saskarnes izstrādi .NET servera daļai, izmantojot TanStack Query un pielāgotu MUI tēmu.',
            },
          ] satisfies Text[],
        },
        {
          client: {
            named: {
              en: 'Tiesu administrācija (TIS2 and elieta.lv)',
              lv: 'Tiesu administrācija (TIS2 un elieta.lv)',
            },
            anonymous: { en: 'Justice sector institution', lv: 'Tieslietu nozares iestāde' },
          },
          when: '2022–2025',
          highlights: [
            {
              en: 'Full-stack development (.NET, React, TypeScript) of a case management system and its public portal, in a five-person team within a project of more than 20 people.',
              lv: 'Full-stack izstrāde (.NET, React, TypeScript) lietu pārvaldības sistēmai un tās publiskajam portālam piecu cilvēku komandā, kas bija daļa no vairāk nekā 20 cilvēku projekta.',
            },
            {
              en: 'Integrated the vehicle and company registers, including PDF extracts, and delivered online applications with payment and automated validation.',
              lv: 'Integrēju transportlīdzekļu un uzņēmumu reģistrus, tostarp PDF izrakstus, un izstrādāju tiešsaistes pieteikumus ar apmaksu un automatizētu pārbaudi.',
            },
          ] satisfies Text[],
        },
        {
          client: {
            named: { en: 'Patentu valde (Patent Office)', lv: 'Patentu valde' },
            anonymous: { en: 'Public-sector institution', lv: 'Valsts pārvaldes iestāde' },
          },
          when: '2024',
          highlights: [
            {
              en: 'Maintained a legacy modular Java system and created a microservice for signing applications in the app: HTML rendered to PDF with Gotenberg, then signed with eParaksts mobile or an eID card.',
              lv: 'Uzturēju esošu modulāru Java sistēmu un izveidoju mikroservisu pieteikumu parakstīšanai lietotnē: HTML pārveide PDF formātā ar Gotenberg un parakstīšana ar eParaksts mobile vai eID karti.',
            },
          ] satisfies Text[],
        },
        {
          client: { en: 'Tet', lv: 'Tet' },
          when: '2022–2023',
          highlights: [
            {
              en: 'Rebuilt tet.lv on a new design system as part of a Scrum team, including the upgrades from Joomla 3 to 4 and PHP 7 to 8 (custom components and plugins, web components).',
              lv: 'Scrum komandas sastāvā pārbūvēju tet.lv jaunā dizaina sistēmā, tostarp pāreju no Joomla 3 uz 4 un no PHP 7 uz 8 (pielāgoti komponenti un spraudņi, web komponenti).',
            },
          ] satisfies Text[],
        },
      ],
    },
    {
      company: 'SIA EventFlow',
      role: {
        en: 'Part-owner, full-stack developer (side project)',
        lv: 'Līdzīpašnieks, full-stack izstrādātājs (blakusprojekts)',
      } satisfies Text,
      years: { en: '2024–present', lv: '2024–šobrīd' } satisfies Text,
      intro: {
        en: 'Team Up, an activity-based social app (Expo, .NET, SignalR).',
        lv: 'Team Up, uz aktivitātēm balstīta sociālā lietotne (Expo, .NET, SignalR).',
      } satisfies Text,
      highlights: [
        {
          en: 'Develop and maintain the Expo mobile app, whose architecture I designed: strict separation of UI and logic, component development in Storybook, unit testing with Vitest and end-to-end testing with Playwright.',
          lv: 'Izstrādāju un uzturu Expo mobilo lietotni, kuras arhitektūru projektēju: stingri nodalīta saskarne un loģika, komponentu izstrāde Storybook vidē, vienībtestēšana ar Vitest un e2e testēšana ar Playwright.',
        },
        {
          en: "Implemented the app's redesign to WCAG 2.1 AA.",
          lv: 'Ieviesu lietotnes jauno dizainu atbilstoši WCAG 2.1 AA.',
        },
      ] satisfies Text[],
      clients: [],
    },
  ],
  /** The section pages' titles and descriptions, read by the pages and their preview cards. */
  pages: {
    building: {
      en: {
        title: 'Building',
        description: 'The products Toms Zvirbulis is building: Team Up and Zvirb.',
      },
      lv: {
        title: 'Projekti',
        description: 'Produkti, ko veido Toms Zvirbulis: Team Up un Zvirb.',
      },
    },
    writing: {
      en: {
        title: 'Writing',
        description: 'Notes and essays by Toms Zvirbulis on building software.',
      },
      lv: {
        title: 'Raksti',
        description: 'Toma Zvirbuļa piezīmes un esejas par programmatūras veidošanu, angļu valodā.',
      },
    },
    cv: {
      en: {
        title: 'CV',
        description: 'Experience and skills of Toms Zvirbulis, software developer in Latvia.',
      },
      lv: {
        title: 'CV',
        description: 'Toma Zvirbuļa, programmatūras izstrādātāja Latvijā, pieredze un prasmes.',
      },
    },
    contact: {
      en: {
        title: 'Contact',
        description: 'How to reach Toms Zvirbulis: email, GitHub and the RSS feed.',
      },
      lv: {
        title: 'Kontakti',
        description: 'Kā sazināties ar Tomu Zvirbuli: e-pasts, GitHub un RSS plūsma.',
      },
    },
  },
  skills: [
    {
      label: { en: 'Programming', lv: 'Programmēšana' } satisfies Text,
      value: 'TypeScript, Java, C#, PHP, SQL, Python',
    },
    {
      label: { en: 'Backend', lv: 'Servera daļa' } satisfies Text,
      value: 'Spring Boot, .NET, SignalR, LiveKit, SOAP and REST APIs, Keycloak',
    },
    {
      label: { en: 'Frontend and mobile', lv: 'Saskarne un mobilās lietotnes' } satisfies Text,
      value:
        'React, Angular, Lit, TanStack Query, MUI, web components, Expo, Storybook, Vitest, Playwright',
    },
    {
      label: { en: 'Data', lv: 'Dati' } satisfies Text,
      value: 'PostgreSQL, Oracle',
    },
    {
      label: { en: 'Infrastructure', lv: 'Infrastruktūra' } satisfies Text,
      value: 'Docker, Kubernetes, Docker Swarm, Portainer, Drone CI',
    },
    {
      label: { en: 'Ways of working', lv: 'Darba metodes' } satisfies Text,
      value: {
        en: 'Scrum; spec-driven development with AI coding agents and code review',
        lv: 'Scrum; specifikācijās balstīta izstrāde ar AI programmēšanas aģentiem un koda pārskatīšanu',
      } satisfies Text,
    },
    {
      label: { en: 'Personal projects', lv: 'Personīgie projekti' } satisfies Text,
      value: 'Go, Rust, Kotlin',
    },
  ],
  /** This site, listed with the products on the CV as the evidence for how Toms works. */
  thisSite: {
    name: 'tomszir.com',
    role: { en: 'Author', lv: 'Autors' } satisfies Text,
    description: {
      en: 'This site: static Astro, built spec-first with AI coding agents and an automated build gate.',
      lv: 'Šī vietne: statisks Astro, veidota ar AI programmēšanas aģentiem, specifikāciju rakstot pirms koda, ar automātisku būvēšanas pārbaudi.',
    } satisfies Text,
  },
  languages: [
    { label: { en: 'Latvian', lv: 'Latviešu' }, value: { en: 'Native', lv: 'Dzimtā' } },
    { label: { en: 'English', lv: 'Angļu' }, value: { en: 'Proficient', lv: 'Brīvi' } },
  ] satisfies { label: Text; value: Text }[],
  education: [
    {
      school: { en: 'Riga Technical University', lv: 'Rīgas Tehniskā universitāte' },
      field: { en: 'Information Technology (BSc)', lv: 'Informācijas tehnoloģija (bakalaurs)' },
      years: '2022–2025',
      note: {
        en: 'Studied alongside full-time work; not completed.',
        lv: 'Studijas paralēli pilna laika darbam, nav pabeigtas.',
      },
    },
  ] satisfies { school: Text; field: Text; years: string; note: Text }[],
} as const
