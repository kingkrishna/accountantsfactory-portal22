const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.cluster0.sijzjfe.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('SRV lookup failed:', err);
        return;
    }
    console.log('SRV Addresses:', addresses);

    if (addresses && addresses.length > 0) {
        const servers = addresses.map(a => `${a.name}:${a.port}`).join(',');
        console.log(`\nStandard Connection String:`);
        console.log(`mongodb://rk3848180_db_user:LRejCnXxrJtP9TjA@${servers}/accountantsfactory_portal?authSource=admin&replicaSet=atlas-2yvlk4-shard-0&ssl=true`);
    }
});
