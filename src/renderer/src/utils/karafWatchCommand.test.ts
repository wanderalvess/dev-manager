import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWatchCommand } from './karafWatchCommand';

test('buildWatchCommand returns list command regardless of target', () => {
  assert.equal(buildWatchCommand('list', '123'), 'bundle:watch --list');
});

test('buildWatchCommand defaults empty target to wildcard', () => {
  assert.equal(buildWatchCommand('start', '   '), 'bundle:watch *');
  assert.equal(buildWatchCommand('stop', ''), 'bundle:watch --stop *');
});

test('buildWatchCommand builds start and stop commands for valid targets', () => {
  assert.equal(buildWatchCommand('start', '42'), 'bundle:watch 42');
  assert.equal(buildWatchCommand('stop', 'com.winthor.*'), 'bundle:watch --stop com.winthor.*');
});

test('buildWatchCommand rejects shell metacharacters', () => {
  assert.equal(buildWatchCommand('start', '42; rm -rf /'), null);
  assert.equal(buildWatchCommand('start', '42 && echo hi'), null);
  assert.equal(buildWatchCommand('stop', '$(whoami)'), null);
  assert.equal(buildWatchCommand('start', '`ls`'), null);
});
