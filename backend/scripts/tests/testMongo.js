const { MongoClient } = require('mongodb');

async function main() {
    const uri = process.env.MONGODB_URI;
    console.log("Connecting to:", uri.replace(/:([^:@]+)@/, ':***@'));
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected successfully to server");
        const db = client.db('accountantsfactory_portal');
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        await client.close();
    }
}

require('dotenv').config();
main();
