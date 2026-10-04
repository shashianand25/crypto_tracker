import cassandra from 'cassandra-driver';

export const client = new cassandra.Client({
  contactPoints: ['127.0.0.1:9042'],
  localDataCenter: 'datacenter1',
  keyspace: 'crypto',
});

export const { types } = cassandra;