require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

console.log('🔧 Starting admin user creation process...\n');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  isVerified: Boolean,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('📡 Connecting to MongoDB...');
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4 // Force IPv4
    });
    
    console.log('✅ MongoDB connected successfully!\n');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log(`🌍 Host: ${mongoose.connection.host}\n`);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@minierp.com' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Status: ${existingAdmin.isActive ? 'Active' : 'Inactive'}`);
      
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Create new admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = new User({
      name: 'Admin',
      email: 'admin@minierp.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isVerified: true
    });
    
    await admin.save();
    
    console.log('\n✅ SUCCESS! Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Email: admin@minierp.com');
    console.log('   Password: admin123');
    console.log('   Role: admin\n');
    console.log('🎉 You can now login to the admin panel!\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('ETIMEOUT') || error.message.includes('ENOTFOUND')) {
      console.log('\n🔍 MongoDB Connection Failed. Possible reasons:');
      console.log('   1. Cluster is still initializing (wait 5-10 minutes)');
      console.log('   2. IP address not whitelisted in MongoDB Atlas');
      console.log('   3. Incorrect connection string');
      console.log('   4. Network/firewall blocking connection');
      console.log('\n💡 Solution:');
      console.log('   - Go to https://cloud.mongodb.com/');
      console.log('   - Check cluster status (should show "IDLE")');
      console.log('   - Verify Network Access has 0.0.0.0/0 whitelisted');
      console.log('   - Wait a few minutes and try again\n');
    }
    
    process.exit(1);
  }
}

createAdmin();
