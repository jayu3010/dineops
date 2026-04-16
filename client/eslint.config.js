import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Project uses API `any` in many places; tighten gradually instead of blocking CI.
      '@typescript-eslint/no-explicit-any': 'off',
      // Legitimate patterns here (reset form state when id changes, POS cart on table change).
      'react-hooks/set-state-in-effect': 'off',
      // e.g. useState(Date.now()) for live clocks — acceptable for this app.
      'react-hooks/purity': 'off',
    },
  },
])
