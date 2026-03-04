const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('\n✅ Connected to MongoDB');
    console.log('\n🔧 Starting customer reference fix...\n');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false, collection: 'customers' }));
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false, collection: 'orders' }));
    const Review = mongoose.model('Review', new mongoose.Schema({}, { strict: false, collection: 'reviews' }));
    const Complaint = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false, collection: 'complaints' }));
    
    // Get all customers from Customers collection
    const customers = await Customer.find({});
    console.log(`Found ${customers.length} customers in Customers collection`);
    
    // Migrate customers to Users collection with role="customer"
    let migratedCount = 0;
    const customerIdMapping = {}; // Old ID -> New ID
    
    for (const customer of customers) {
      // Check if user already exists with this email
      let user = await User.findOne({ email: customer.email });
      
      if (!user) {
        // Create user with customer role
        user = await User.create({
          name: customer.name,
          email: customer.email,
          password: customer.password,
          role: 'customer',
          phone: customer.phone,
          address: customer.address,
          isActive: customer.isActive !== undefined ? customer.isActive : true,
          isVerified: customer.isVerified !== undefined ? customer.isVerified : true,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        });
        console.log(`✅ Migrated customer ${customer.email} to User collection`);
        migratedCount++;
      }
      
      // Map old customer ID to new user ID
      customerIdMapping[customer._id.toString()] = user._id;
    }
    
    console.log(`\n✅ Migrated ${migratedCount} customers to Users collection`);
    console.log(`📝 Customer ID mapping created with ${Object.keys(customerIdMapping).length} entries\n`);
    
    // Update Orders
    console.log('🔧 Updating Orders...');
    let ordersUpdated = 0;
    let ordersOrphaned = 0;
    const orders = await Order.find({});
    for (const order of orders) {
      const newCustomerId = customerIdMapping[order.customerId?.toString()];
      if (newCustomerId) {
        await Order.updateOne({ _id: order._id }, { customerId: newCustomerId });
        ordersUpdated++;
      } else {
        ordersOrphaned++;
        console.log(`⚠️  Order ${order.orderNumber} has orphaned customerId: ${order.customerId}`);
      }
    }
    console.log(`✅ Updated ${ordersUpdated} orders, ${ordersOrphaned} orphaned\n`);
    
    // Update Reviews
    console.log('🔧 Updating Reviews...');
    let reviewsUpdated = 0;
    let reviewsOrphaned = 0;
    const reviews = await Review.find({});
    for (const review of reviews) {
      const newCustomerId = customerIdMapping[review.customerId?.toString()];
      if (newCustomerId) {
        await Review.updateOne({ _id: review._id }, { customerId: newCustomerId });
        reviewsUpdated++;
      } else {
        reviewsOrphaned++;
        console.log(`⚠️  Review ${review._id} has orphaned customerId: ${review.customerId}`);
      }
    }
    console.log(`✅ Updated ${reviewsUpdated} reviews, ${reviewsOrphaned} orphaned\n`);
    
    // Update Complaints
    console.log('🔧 Updating Complaints...');
    let complaintsUpdated = 0;
    let complaintsOrphaned = 0;
    const complaints = await Complaint.find({});
    for (const complaint of complaints) {
      const newCustomerId = customerIdMapping[complaint.customerId?.toString()];
      if (newCustomerId) {
        await Complaint.updateOne({ _id: complaint._id }, { customerId: newCustomerId });
        complaintsUpdated++;
      } else {
        complaintsOrphaned++;
        console.log(`⚠️  Complaint ${complaint._id} has orphaned customerId: ${complaint.customerId}`);
      }
    }
    console.log(`✅ Updated ${complaintsUpdated} complaints, ${complaintsOrphaned} orphaned\n`);
    
    // Handle orphaned records - assign to admin user
    if (ordersOrphaned > 0 || reviewsOrphaned > 0 || complaintsOrphaned > 0) {
      console.log('\n🔧 Handling orphaned records...');
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (adminUser) {
        console.log(`Using admin user: ${adminUser.email} (${adminUser._id})`);
        
        // Update orphaned orders
        const orphanedOrders = await Order.find({ customerId: { $nin: await User.find({}).distinct('_id') } });
        for (const order of orphanedOrders) {
          await Order.updateOne({ _id: order._id }, { customerId: adminUser._id });
          console.log(`  ✅ Linked orphaned order ${order.orderNumber} to admin`);
        }
        
        // Update orphaned reviews
        const orphanedReviews = await Review.find({ customerId: { $nin: await User.find({}).distinct('_id') } });
        for (const review of orphanedReviews) {
          await Review.updateOne({ _id: review._id }, { customerId: adminUser._id });
          console.log(`  ✅ Linked orphaned review ${review._id} to admin`);
        }
        
        // Update orphaned complaints
        const orphanedComplaints = await Complaint.find({ customerId: { $nin: await User.find({}).distinct('_id') } });
        for (const complaint of orphanedComplaints) {
          await Complaint.updateOne({ _id: complaint._id }, { customerId: adminUser._id });
          console.log(`  ✅ Linked orphaned complaint ${complaint._id} to admin`);
        }
      }
    }
    
    console.log('\n✅ Migration complete!');
    console.log('\n📊 Summary:');
    console.log(`  - Customers migrated: ${migratedCount}`);
    console.log(`  - Orders updated: ${ordersUpdated}`);
    console.log(`  - Reviews updated: ${reviewsUpdated}`);
    console.log(`  - Complaints updated: ${complaintsUpdated}`);
    console.log(`  - Orphaned records fixed: ${ordersOrphaned + reviewsOrphaned + complaintsOrphaned}`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
