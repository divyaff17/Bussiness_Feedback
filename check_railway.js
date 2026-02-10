import https from 'https';
import dns from 'dns';

// Force Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

const url = 'https://bussinessfeedback-production.up.railway.app/health';
console.log('Checking Railway:', url);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
