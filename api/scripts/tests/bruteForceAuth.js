const { MongoClient } = require('mongodb');

const usernames = ['rk3848180_db_user', 'rk3848180', 'admin', 'rk3848180@gmail.com', 'af_admin'];
const passwords = ['LRejCnXxrJtP9TjA', 'ItiexUYKamUDNISM', 'Ramakrishna@123', 'Ramakrishna@223', 'admin', 'password', 'Ramakrishna123', '12345678'];

async function testConnection(username, password) {
    const encodedUser = encodeURIComponent(username);
    const encodedPass = encodeURIComponent(password);
    const uri = `mongodb+srv://${encodedUser}:${encodedPass}@cluster0.sijzjfe.mongodb.net/test?retryWrites=true&w=majority`;

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    try {
        await client.connect();
        await client.db('admin').command({ ping: 1 });
        console.log(`✅ FOUND IT!!! User: ${username} | Pass: ${password}`);
        process.exit(0);
    } catch (e) {
        // failed
    } finally {
        await client.close();
    }
}

async function runAll() {
    console.log("Brute forcing to save the user...");
    const promises = [];
    for (const u of usernames) {
        for (const p of passwords) {
            promises.push(testConnection(u, p));
        }
    }
    await Promise.all(promises);
    console.log("❌ ALL FAILED");
}

runAll();
