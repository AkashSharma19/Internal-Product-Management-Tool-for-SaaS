import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://sharmaakash4299_db_user:EG42NR5BEW3YDN8w@cluster0.dsmnckl.mongodb.net/internal_portal?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");
    
    const db = mongoose.connection.db;
    
    console.log("\n--- RECENT CONTENT ITEMS ---");
    const contentItems = await db.collection('contentitems').find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log(JSON.stringify(contentItems, null, 2));

    console.log("\n--- RECENT PRODUCT ITEMS ---");
    const productItems = await db.collection('productitems').find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log(JSON.stringify(productItems, null, 2));
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run();
