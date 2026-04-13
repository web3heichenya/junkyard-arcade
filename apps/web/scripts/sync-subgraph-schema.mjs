import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const src = path.join(repoRoot, 'subgraph', 'build', 'schema.graphql');
const out = path.join(process.cwd(), 'src', 'graphql', 'junkyard.schema.graphql');

const scalars = `# Generated from ../subgraph/build/schema.graphql
scalar Int
scalar Float
scalar String
scalar Boolean
scalar BigInt
scalar BigDecimal
scalar Bytes
scalar Int8
`;

const raw = await fs.readFile(src, 'utf8');
const queryShim = `

schema {
  query: Query
}

# Minimal query root for Graph Client codegen.
# Graph Node adds a richer Query type at runtime.
type Query {
  global(id: ID!): Global
  series(id: ID!): Series
  series_collection: [Series!]!
  user(id: ID!): User
}
`;

const content = `${scalars}\n${raw}\n${queryShim}`;
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, content, 'utf8');

console.log(`Wrote ${out}`);
