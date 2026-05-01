import { tanstackConfig } from '@tanstack/eslint-config';
import react from 'eslint-plugin-react';
import stylistic from '@stylistic/eslint-plugin';

export default [
  ...tanstackConfig,
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-sort-props': ['error', {
        reservedFirst: true,
        shorthandLast: true,
        callbacksLast: true,
        noSortAlphabetically: true,
      }],
    },
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/no-tabs': 'error',
      '@stylistic/arrow-spacing': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/jsx-pascal-case': 'error',
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/no-extra-parens': ['error', 'all', { ternaryOperandBinaryExpressions: false, nestedBinaryExpressions: false, ignoredNodes: [
          "SpreadElement[argument.type=ConditionalExpression]",
          "SpreadElement[argument.type=LogicalExpression]",
          "SpreadElement[argument.type=AwaitExpression]",
        ]
      }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/block-spacing': ['error', 'always'],
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      '@stylistic/jsx-tag-spacing': ['error', { beforeClosing: 'never' }],
      '@stylistic/jsx-curly-spacing': ['error', { when: 'never', children: { when: 'never' } }],
      '@stylistic/type-annotation-spacing': ['error', { before: false, after: true, overrides: { arrow: 'ignore' } }],
      '@stylistic/indent': ['error', 2],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 2 }],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'never',
        named: 'never',
      }],
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          enums: 'always-multiline',
        },
      ],
      '@stylistic/max-len': [
        'error',
        {
          code: 240,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignoreComments: true,
        },
      ],
    },
  },
];
