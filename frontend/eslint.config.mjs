import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/** @type {import('eslint').Linter.Config[]} */
export default [...next, ...nextCoreWebVitals, ...nextTypescript, {
  files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}']
}, {
  languageOptions: { globals: globals.browser }
}, pluginJs.configs.recommended, ...tseslint.configs.recommended, pluginReact.configs.flat.recommended, {
  plugins: {
    'jsx-a11y': jsxA11y
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/naming-convention': 'off',
    'react/function-component-definition': 'off',
    'react/require-default-props': 'off',
    'react/jsx-filename-extension': 'off',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'import/order': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/prefer-read-only-props': 'off',
    'react/button-has-type': 'error',
    'react/no-array-index-key': 'error'
  }
}, {
  files: ['next.config.js'],
  rules: {}
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];
