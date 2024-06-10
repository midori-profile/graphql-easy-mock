const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const cors = require('cors');

// Build a schema using the GraphQL schema language
const schema = buildSchema(`
  type Query {
    items: [String]
    getTypes: [String]
  }
`);

// root provides resolver functions for each API entry endpoint
const root = {
  items: () => {
    return ['Item 1', 'Item 2', 'Item 3'];
  },
  getTypes: () => {
    return ['Type 1', 'Type 2', 'Type 3'];
  },
};

const app = express();
app.use(cors()); 
app.use('/api/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true, // Start the GraphiQL tool for testing
}));

app.get('/api/getNames', (req, res) => {
  res.json(['restful-Name 1', 'restful-Name 2', 'restful-Name 3']);
});

app.listen(4000, () => console.log('GraphQL server running on http://localhost:4000/graphql'));