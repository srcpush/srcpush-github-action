const ncc = require('@vercel/ncc');
const fs = require('fs');
const { boolish } = require('getenv');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const actionsDir = path.resolve(__dirname, 'src/actions');
const buildDir = path.resolve(__dirname, 'build');
const modulesDir = path.resolve(__dirname, 'node_modules');

prebuild().then(() => build());

async function prebuild() {
  if (!boolish(process.env.CI, false)) {
    return console.log('Skipped CI environment simulation');
  }

  console.log('Preparing build in simulated CI environment');

  await fs.promises.rm(buildDir, { force: true, recursive: true });
  await fs.promises.rm(modulesDir, { force: true, recursive: true });

  await exec('npm install');
}

async function build() {
  console.log('Building actions');

  const actions = fs
    .readdirSync(actionsDir, { withFileTypes: true })
    .filter(entity => entity.isFile())
    .map(entity => ({
      name: path.basename(entity.name, path.extname(entity.name)),
      file: path.resolve(actionsDir, entity.name),
    }));

  for (const action of actions) {
    const files = await compile(action.file);
    write(files, path.resolve(buildDir, action.name));

    console.log(`✓ ${path.relative(__dirname, action.file)}`);
  }

  console.log();
  console.log('All actions built');
}

async function compile(entry) {
  const { code, map, assets } = await ncc(entry, {
    externals: [],
    cache: false,
    license: 'license.txt',
    quiet: true,
  });

  return {
    ...assets,
    'index.js': { source: code },
    'index.js.map': { source: map },
  };
}

function write(files, dir) {
  for (const fileName in files) {
    if (!files[fileName].source) {
      continue;
    }

    const filePath = path.resolve(dir, fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, files[fileName].source, { encoding: 'utf-8' });
  }
}
