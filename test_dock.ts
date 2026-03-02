import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('dock updated correctly', () => {
    const code = fs.readFileSync('src/app/components/ui/Dock.tsx', 'utf8');
    assert.match(code, /useWindowDimensions/);
    assert.match(code, /dockScale/);
    assert.match(code, /<\/motion\.div>\n      <\/div>\n   \);\n\};/);
});
