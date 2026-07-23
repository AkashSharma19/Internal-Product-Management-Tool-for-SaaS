const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://sharmaakash4299_db_user:EG42NR5BEW3YDN8w@cluster0.dsmnckl.mongodb.net/internal_portal?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    const speaker = await db.collection('configspeakers').findOne({});
    console.log("Speaker ID:", speaker.id);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
