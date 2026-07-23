const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://sharmaakash4299_db_user:EG42NR5BEW3YDN8w@cluster0.dsmnckl.mongodb.net/internal_portal?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;

    // Fetch collections
    const productsRaw = await db.collection('productitems').find({}).toArray();
    const adminCallsRaw = await db.collection('admincalls').find({}).toArray();

    const products = productsRaw.map((item) => ({ ...item, id: item.id || String(item._id) }));
    const parentMeetings = adminCallsRaw.map((item) => ({ ...item, id: item.id || String(item._id) }));

    console.log(`Total Products (productitems): ${products.length}`);
    console.log(`Total Admin Calls: ${parentMeetings.length}`);

    const getParent = (item) => {
      const notes = item.notes || '';
      if (notes.includes('Admin Call ID:')) {
        const match = notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
        if (match && match[1]) return parentMeetings.find((p) => p.id === match[1]);
      }
      return undefined;
    };

    // Filter feedback
    const filtered = products.filter((item) => {
      if (item.id.startsWith('prod-temp-')) return false;

      if (item.id.startsWith('prod-ama-') || item.id.startsWith('prod-tarun-')) return false;
      const parent = getParent(item);
      if (item.id.startsWith('prod-call-') && !parent) return false;
      
      if (!item.notes?.includes('Admin Call ID:') && !item.id.startsWith('prod-call-')) return false;
      return true;
    });

    console.log(`Filtered admin feedback items count: ${filtered.length}`);
    if (filtered.length > 0) {
      console.log("First 3 matched items:");
      console.log(JSON.stringify(filtered.slice(0, 3).map(item => ({
        id: item.id,
        feature: item.feature,
        notes: item.notes,
        parentExists: !!getParent(item)
      })), null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
