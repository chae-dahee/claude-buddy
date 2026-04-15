#!/usr/bin/env node
'use strict';
// CommonJS wrapper — ESM dist loaded via dynamic import()
const path = require('path');
const distUrl = 'file://' + path.resolve(__dirname, '..', 'dist', 'cli', 'install.js').replace(/\\/g, '/');

import(distUrl)
  .then(({ runInstall }) => runInstall({ silent: true }))
  .catch(() => { /* dist not built yet — skip silently */ });
