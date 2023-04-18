module.exports = {
  client: {
    includes: ['./frontend/app/**/**/*.tsx'],
    excludes: ['**/__tests__/**'],
    service: {
      name: 'frontend',
      localSchemaFile: './schema-compiled.graphql',
    },
  },
};
