import cassandra from 'cassandra-driver';
import { config } from './config.js';

export const client = new cassandra.Client({
  contactPoints: config.cassandraHosts,
  localDataCenter: config.cassandraDc,
  keyspace: config.keyspace,
});

export const { types } = cassandra;

// Connect explicitly at startup, retrying a few times with growing waits (1s, 2s, 4s, 8s).
// Throws a readable error if Cassandra never answers.
export async function connectDb(attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await client.connect();
      console.log(`Connected to Cassandra (keyspace ${config.keyspace})`);
      return;
    } catch (err) {
      console.error(`Cassandra connection failed (attempt ${i}/${attempts}): ${err.message.split('\n')[0]}`);
      if (i === attempts) {
        throw new Error(
          `Cannot reach Cassandra at ${config.cassandraHosts.join(', ')}. ` +
          'Is the Docker container running (docker start cass) and is the schema loaded?'
        );
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (i - 1)));
    }
  }
}
