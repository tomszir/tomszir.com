import type { APIRoute, GetStaticPaths } from 'astro'
import { aloftThemeFile, aloftThemes } from '../../../lib/aloft'

export const getStaticPaths = (() =>
  aloftThemes.map(({ id, theme }) => ({
    params: { theme: id },
    props: { theme },
  }))) satisfies GetStaticPaths

type Props = Pick<(typeof aloftThemes)[number], 'theme'>

export const GET: APIRoute<Props> = ({ props }) =>
  new Response(aloftThemeFile(props.theme), { headers: { 'Content-Type': 'application/json' } })
