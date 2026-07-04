import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser APIs
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLLabelElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        KeyboardEvent: 'readonly',
        PopStateEvent: 'readonly',
        MediaQueryListEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        ServiceWorkerRegistration: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        AbortSignal: 'readonly',
        AbortController: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        ChildNode: 'readonly',
        React: 'readonly',
        Node: 'readonly',
        MouseEvent: 'readonly',
        Window: 'readonly',
        Navigator: 'readonly',
        performance: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        requestAnimationFrame: 'readonly',
        // Supabase/Vite globals
        __APP_VERSION__: 'readonly',
        __APP_BUILD__: 'readonly',
        __APP_HASH__: 'readonly',
        __BUILD_TIME__: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
      rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off', // TS já verifica isso
      '@typescript-eslint/no-explicit-any': 'off', // any é comum em React/hooks
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // React Hooks rules (importante!)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',

      // Desabilitar regras de variáveis não usadas do ESLint base
      'no-unused-vars': 'off',

      // Regras ruidosas que não são críticas
      'no-useless-escape': 'off',
      'no-async-promise-executor': 'off',
      'no-console': 'off', // já configurado acima mas garantir
      'no-console': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.next/**',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'eslint.config.js',
    ],
  },
];
