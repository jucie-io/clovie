import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClovie } from '../lib/createClovie.js';
import fs from 'fs';
import path from 'path';

const fixture = path.resolve(process.cwd(), '__tests__', 'fixtures', 'static-build');
const dist = path.join(fixture, 'dist');
const read = (file) => fs.readFileSync(path.join(dist, file), 'utf8');

describe('Static build', () => {
  beforeAll(async () => {
    fs.rmSync(dist, { recursive: true, force: true });
    const clovie = await createClovie({
      optsPath: path.join(fixture, 'clovie.config.js'),
      mode: 'production'
    });
    await clovie.run.build();
  });

  afterAll(() => {
    fs.rmSync(dist, { recursive: true, force: true });
  });

  it('renders views in subfolders', () => {
    expect(read('index.html')).toContain('home');
    expect(read('nested/index.html')).toContain('nested');
  });

  it('renders one page per repeated route item', () => {
    expect(read('items/one/index.html')).toContain('item one');
    expect(read('items/two/index.html')).toContain('item two');
  });
});
