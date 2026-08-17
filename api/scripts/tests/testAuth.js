const { MongoClient } = require('mongodb');

async function testAuth(username, password) {
    const uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@cluster0.sijzjfe.mongodb.net/admin?retryWrites=true&w=majority`;
    console.log(`Trying: ${username}`);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log(`✅ SUCCESS! Connected with username: ${username}`);
        return true;
    } catch (err) {
        if (!err.message.includes('bad auth')) {
            console.log(`❌ Network Error: ${err.message}`);
        }
        return false;
    } finally {
        await client.close();
    }
}

async function main() {
    const users = ['rk3848180_db_user', 'rk3848180', 'admin', 'rk3848180@gmail.com', 'af_admin'];
    for (const u of users) {
        await testAuth(u, 'LRejCnXxrJtP9TjA');
        await testAuth(u, 'ItiexUYKamUDNISM');
        await testAuth(u, 'Ramakrishna@123');
    }
}

main();
