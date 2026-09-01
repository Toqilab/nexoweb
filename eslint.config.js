import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // NexoWeb carga datos remotos al cambiar de sesión o acuario. Esta regla
      // experimental interpreta esas cargas asíncronas como actualizaciones
      // síncronas aunque el estado se actualice después de esperar a Supabase.
      'react-hooks/set-state-in-effect': 'off',
      // El proyecto todavía no utiliza React Compiler. Conservamos activas
      // rules-of-hooks y exhaustive-deps, que sí protegen el orden de hooks.
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])
