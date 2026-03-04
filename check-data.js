const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('\n✅ Connected to MongoDB');
    
    // Check Users collection
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const users = await User.find({}).limit(5);
    console.log('\n📊 USERS COLLECTION:');
    console.log(`Total users: ${await User.countDocuments()}`);
    if (users.length > 0) {
      console.log('Sample user:', {
        _id: users[0]._id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
        phone: users[0].phone,
        address: users[0].address
      });
    }
    
    // Check Customers collection
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false, collection: 'customers' }));
    const customers = await Customer.find({}).limit(5);
    console.log('\n📊 CUSTOMERS COLLECTION:');
    console.log(`Total customers: ${await Customer.countDocuments()}`);
    if (customers.length > 0) {
      console.log('Sample customer:', {
        _id: customers[0]._id,
        name: customers[0].name,
        email: customers[0].email,
        phone: customers[0].phone,
        address: customers[0].address
      });
    }
    
    // Check Orders collection
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false, collection: 'orders' }));
    const orders = await Order.find({}).limit(5);
    console.log('\n📊 ORDERS COLLECTION:');
    console.log(`Total orders: ${await Order.countDocuments()}`);
    if (orders.length > 0) {
      console.log('Sample order:', {
        _id: orders[0]._id,
        orderNumber: orders[0].orderNumber,
        customerId: orders[0].customerId,
        customerIdType: typeof orders[0].customerId
      });
      
      // Check if customerId exists in Users
      const userExists = await User.findById(orders[0].customerId);
      console.log('CustomerId exists in Users?', !!userExists);
      
      // Check if customerId exists in Customers
      const customerExists = await Customer.findById(orders[0].customerId);
      console.log('CustomerId exists in Customers?', !!customerExists);
    }
    
    // Check Reviews collection
    const Review = mongoose.model('Review', new mongoose.Schema({}, { strict: false, collection: 'reviews' }));
    const reviews = await Review.find({}).limit(5);
    console.log('\n📊 REVIEWS COLLECTION:');
    console.log(`Total reviews: ${await Review.countDocuments()}`);
    if (reviews.length > 0) {
      console.log('Sample review:', {
        _id: reviews[0]._id,
        customerId: reviews[0].customerId
      });
      
      const userExists = await User.findById(reviews[0].customerId);
      console.log('CustomerId exists in Users?', !!userExists);
      
      const customerExists = await Customer.findById(reviews[0].customerId);
      console.log('CustomerId exists in Customers?', !!customerExists);
    }
    
    // Check Complaints collection
    const Complaint = mongoose.model('Complaint', new mongoose.Schema({}, { strict: false, collection: 'complaints' }));
    const complaints = await Complaint.find({}).limit(5);
    console.log('\n📊 COMPLAINTS COLLECTION:');
    console.log(`Total complaints: ${await Complaint.countDocuments()}`);
    if (complaints.length > 0) {
      console.log('Sample complaint:', {
        _id: complaints[0]._id,
        customerId: complaints[0].customerId
      });
      
      const userExists = await User.findById(complaints[0].customerId);
      console.log('CustomerId exists in Users?', !!userExists);
      
      const customerExists = await Customer.findById(complaints[0].customerId);
      console.log('CustomerId exists in Customers?', !!customerExists);
    }
    
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
