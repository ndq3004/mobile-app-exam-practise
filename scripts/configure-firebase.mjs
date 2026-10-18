import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(root, '.tools/firebase/node_modules/firebase-tools/lib/bin/firebase.js');
const project = 'exam-render-dev';
const bundle = 'com.examrender.examreader';
function firebase(...args) {
  let output;
  try {
    output = execFileSync(process.execPath, [cli, ...args,
    '--project', project, '--json', '--non-interactive'],
    {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  } catch (error) {
    // Node 24 on Windows can abort during CLI shutdown after returning success.
    // Accept only an explicit complete JSON success response in that exact case.
    if (!String(error.stderr).includes('UV_HANDLE_CLOSING')) throw error;
    const reply = JSON.parse(String(error.stdout));
    if (reply.status !== 'success' || reply.result == null) throw error;
    return reply.result;
  }
  const reply = JSON.parse(output);
  if (reply.status !== 'success') throw new Error('Firebase command failed');
  return reply.result;
}
function writeConfig(platform, values) {
  const config = {APP_ENV: 'dev', FIREBASE_PROJECT_ID: values.projectId,
    FIREBASE_API_KEY: values.apiKey, FIREBASE_APP_ID: values.appId,
    FIREBASE_MESSAGING_SENDER_ID: values.messagingSenderId,
    FIREBASE_AUTH_DOMAIN: values.authDomain ?? '',
    FIREBASE_IOS_BUNDLE_ID: platform === 'ios' ? bundle : ''};
  if (config.FIREBASE_PROJECT_ID !== project ||
      ['FIREBASE_API_KEY', 'FIREBASE_APP_ID', 'FIREBASE_MESSAGING_SENDER_ID'].some(key => !config[key])) {
    throw new Error('Firebase returned incomplete or unexpected configuration');
  }
  fs.writeFileSync(path.join(root, `app/config/dev.${platform}.json`), JSON.stringify(config, null, 2) + '\n');
}
try {
  const apps = firebase('apps:list');
  const webName = 'Exam Render Web (dev)';
  const matches = apps.filter(app => app.platform === 'WEB' && app.displayName === webName);
  if (matches.length > 1) throw new Error('Multiple matching web apps; select one manually');
  const web = matches[0] ?? firebase('apps:create', 'WEB', webName);
  const webConfig = firebase('apps:sdkconfig', 'WEB', web.appId).sdkConfig;
  writeConfig('web', webConfig);
  const iosApps = apps.filter(app => app.platform === 'IOS' && (app.bundleId ?? app.namespace) === bundle);
  if (iosApps.length > 1) throw new Error('Multiple matching iOS apps');
  const ios = iosApps[0] ?? firebase('apps:create', 'IOS', 'Exam Render iOS (dev)', '--bundle-id', bundle);
  const plist = firebase('apps:sdkconfig', 'IOS', ios.appId).fileContents;
  const value = key => plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))?.[1];
  writeConfig('ios', {projectId: value('PROJECT_ID'), apiKey: value('API_KEY'),
    appId: value('GOOGLE_APP_ID'), messagingSenderId: value('GCM_SENDER_ID')});
  // Explicit Dart FirebaseOptions are the sole runtime configuration source.
  console.log(`Configured iOS + web for ${project}. No data or Hosting deployment performed.`);
} catch (error) {
  console.error('Configuration did not finish. Sign in with Firebase CLI, check project permissions, then run again.');
  console.error(error.message);
  process.exitCode = 1;
}
