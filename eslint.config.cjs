const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // 禁止从 @uiw/react-md-editor 标准入口导入（含 rehype-raw XSS 风险）
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@uiw/react-md-editor',
          message: '请使用 @uiw/react-md-editor/nohighlight 变体，标准版包含 rehype-raw XSS 风险',
        }],
      }],
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'coverage/'],
  },
];
