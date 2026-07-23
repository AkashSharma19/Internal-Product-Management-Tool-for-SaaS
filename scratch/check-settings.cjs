const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://sharmaakash4299_db_user:EG42NR5BEW3YDN8w@cluster0.dsmnckl.mongodb.net/internal_portal?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    // Check globalsettings collection
    const globalSettingsCol = collections.find(c => c.name.toLowerCase().includes('setting'));
    if (globalSettingsCol) {
      console.log(`Inspecting collection: ${globalSettingsCol.name}`);
      const settings = await db.collection(globalSettingsCol.name).find({}).toArray();
      console.log("Settings content:");
      console.log(JSON.stringify(settings, null, 2));
    } else {
      console.log("No settings collection found");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
