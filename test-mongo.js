const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://mabdulbasit122_db_user:Basit123%2A@cluster0.jvyk3ka.mongodb.net/minierp?retryWrites=true&w=majority';

console.log('Testing MongoDB connection...');
console.log('URI:', MONGO_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  family: 4 // Force IPv4
})
.then(() => {
  console.log('\n✅ SUCCESS! MongoDB connected successfully');
  console.log('📦 Database:', mongoose.connection.name);
  console.log('🌍 Host:', mongoose.connection.host);
  process.exit(0);
})
.catch((error) => {
  console.log('\n❌ FAILED! MongoDB connection error:');
  console.log('Error:', error.message);
  console.log('\nPossible issues:');
  console.log('1. IP address not whitelisted in MongoDB Atlas');
  console.log('2. Wrong username or password');
  console.log('3. Cluster not ready yet (wait a few minutes if just created)');
  console.log('4. Network/firewall blocking connection');
  process.exit(1);
});
