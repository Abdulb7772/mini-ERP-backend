require('dotenv/config');
const mongoose = require('mongoose');

async function listDatabases() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('✅ Connected successfully!\n');
    
    // Get admin access to list all databases
    const admin = mongoose.connection.db.admin();
    const result = await admin.listDatabases();
    
    console.log('📚 Available databases:');
    console.log('='.repeat(60));
    
    result.databases.forEach(db => {
      console.log(`\n📦 Database: ${db.name}`);
      console.log(`   Size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Empty: ${db.empty ? 'Yes' : 'No'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n🔍 Current database: ${mongoose.connection.db.databaseName}`);
    
    // List collections in current database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📑 Collections in '${mongoose.connection.db.databaseName}':`);
    
    if (collections.length === 0) {
      console.log('   ⚠️  No collections found (database is empty)');
    } else {
      for (const coll of collections) {
        const count = await mongoose.connection.db.collection(coll.name).countDocuments();
        console.log(`   - ${coll.name}: ${count} documents`);
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listDatabases();
