import fs from 'node:fs'
import path from 'node:path'

function getArgValue(args, name) {
  const idx = args.indexOf(name)
  if (idx === -1) return undefined
  return args[idx + 1]
}

const args = process.argv.slice(2)
const run = getArgValue(args, '--run') ?? process.env.GITHUB_RUN_NUMBER
const preid = getArgValue(args, '--preid') ?? 'beta'
const printOnly = args.includes('--print-only')

if (!run) {
  // eslint-disable-next-line no-console
  console.error('Missing run number. Pass --run <number> or set GITHUB_RUN_NUMBER.')
  process.exit(1)
}

const packageJsonPath = path.resolve(process.cwd(), 'package.json')
const raw = fs.readFileSync(packageJsonPath, 'utf8')
const pkg = JSON.parse(raw)

if (!pkg.version || typeof pkg.version !== 'string') {
  // eslint-disable-next-line no-console
  console.error('package.json is missing a valid "version" field.')
  process.exit(1)
}

const baseVersion = pkg.version.split('-')[0]
const devVersion = `${baseVersion}-${preid}.${run}`

if (printOnly) {
  // eslint-disable-next-line no-console
  console.log(devVersion)
  process.exit(0)
}

pkg.version = devVersion
fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

// eslint-disable-next-line no-console
console.log(`Set package.json version to ${devVersion}`)
