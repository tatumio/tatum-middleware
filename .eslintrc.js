module.exports = {
  extends: ['airbnb-base'],
  rules: {
    'no-use-before-define': 'off',
    'no-restricted-syntax': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    quotes: [2, 'single', {avoidEscape: true, allowTemplateLiterals: true}],
    radix: 'off',
    'max-len': [0, 170],
    'object-curly-spacing': 'off',
    'prefer-destructuring': 'off',
    'no-empty': 'off'
  },
};
