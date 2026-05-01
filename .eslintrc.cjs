module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2019: true,
    jest: true,
  },
  ignorePatterns: ['dist/', 'src/__generated__/'],
  rules: {
    // tests and resolvers use `any` extensively against untyped REST payloads
    '@typescript-eslint/no-explicit-any': 'off',
    // depth-limit and safety tests use require() calls
    '@typescript-eslint/no-require-imports': 'off',
    // resolver files use console for observability
    'no-console': 'off',
    // unused vars are flagged by tsc; let eslint skip them to avoid duplication
    '@typescript-eslint/no-unused-vars': 'off',
  },
};
