import fs from 'fs-extra';
import { isDev, isFirefox, log, outputDir, port, r } from './utils.js';
import { type Manifest } from 'webextension-polyfill';
import type PkgType from '../package.json';

async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType;

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: isFirefox ? 2 : 3,
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    options_ui: {
      page: './dist/options/index.html',
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ['dist/background/index.mjs'],
          type: 'module',
        }
      : {
          service_worker: './dist/background/index.mjs',
        },
    icons: {
      16: './assets/icon-512.png',
      48: './assets/icon-512.png',
      128: './assets/icon-512.png',
    },
    permissions: ['tabs', 'storage', 'activeTab', 'scripting', 'unlimitedStorage', 'contextMenus'],
    content_security_policy: {
      extension_pages: isDev
        ? `script-src \'self\' http://localhost:${port}; object-src \'self\';`
        : "script-src 'self'; object-src 'self'",
    },
  };

  // add extension action icon
  if (!isFirefox) {
    manifest.action = {
      default_icon: './assets/icon-512.png',
    };
  }

  // add host permissions
  if (isFirefox) {
    manifest.permissions?.push('*://*/*');
  } else {
    manifest.host_permissions = ['*://*/*'];
  }

  // add content security policy
  if (isFirefox) {
    manifest.content_security_policy = isDev
      ? `script-src 'self' http://localhost:${port}; object-src 'self';`
      : `script-src 'self'; object-src 'self';`;
  } else {
    manifest.content_security_policy = {
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self';`
        : "script-src 'self'; object-src 'self'",
    };
  }

  // add content scripts
  manifest.content_scripts = [
    {
      matches: ['<all_urls>'],
      js: ['dist/contentScripts/index.global.js'],
    },
  ];
  manifest.web_accessible_resources = isFirefox
    ? ['dist/contentScripts/index.css']
    : [
        {
          resources: ['dist/contentScripts/index.css'],
          matches: ['<all_urls>'],
        },
      ];

  // add sidepanel
  if (isFirefox) {
    manifest.sidebar_action = {
      default_panel: 'dist/sidepanel/index.html',
    };
  } else {
    // the sidebar_action does not work for chromium based
    (manifest as any).side_panel = {
      default_path: 'dist/sidepanel/index.html',
    };
    manifest.permissions?.push('sidePanel');
  }

  return manifest;
}

export async function writeManifest() {
  await fs.writeJSON(r(`${outputDir}/manifest.json`), await getManifest(), {
    spaces: 2,
  });
  log('PRE', 'write manifest.json');
}

writeManifest();
