import { defineConfig } from 'vitest/config';

//  Scope the brain suite to this repo's own tests. Without this, a stray git worktree
//  under .claude/ (another session's checkout) gets scanned too, and its stale copies of
//  the tests run against a stale brain — noise that CI (a clean checkout) never sees.
export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/.claude/**', '**/dist/**', '**/builds/**']
    }
});
