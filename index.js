const {configDotenv} = require("dotenv");
configDotenv({path: '.env.Local'});
configDotenv();

const firewallId = parseInt(process.env.FIREWALL_ID);
const token = process.env.TOKEN;

if (!token)
    throw "Token required";

if (firewallId < 0 || isNaN(firewallId))
    throw "Invalid firewall ID";

let publicIp;

const getPublicIp = () => fetch('https://cloudflare.com/cdn-cgi/trace')
    .then(x => x.text())
    .then(x => x.split('\n').find(x => x.startsWith('ip=')).substring(3));

(async () => {
    // noinspection InfiniteLoopJS
    while (true) {
        const currentPublicIp = await getPublicIp();
        if (publicIp !== currentPublicIp) {
            console.log(new Date(), 'IP Address Changed', publicIp, currentPublicIp)
            const body = {
                "rules": [
                    {
                        "description": process.env.FIREWALL_DESC,
                        "direction": "in",
                        "protocol": "tcp",
                        "port": "any",
                        "source_ips": [
                            `${currentPublicIp}/32`
                        ]
                    }
                ]
            };

            const result = await fetch(
                `https://api.hetzner.cloud/v1/firewalls/${firewallId}/actions/set_rules`, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });

            if (result.status === 201)
                console.log(new Date(), 'Successfully update firewall')
        }

        publicIp = currentPublicIp;
        await new Promise(r => setTimeout(r, 30000));
    }
})();