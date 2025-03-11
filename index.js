const express = require('express');
const cors = require('cors');
const dns = require('dns').promises;
const app = express();
app.use(express.json());
app.use(cors());

async function validateEmail(email) {
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, reason: 'Invalid format' };
    }

    const [, domain] = email.split('@');

    try {
        // Check MX records
        const mxRecords = await dns.resolveMx(domain);
        
        // Check A records as backup
        const aRecords = await dns.resolve(domain).catch(() => []);
        
        return {
            valid: mxRecords.length > 0 || aRecords.length > 0,
            reason: mxRecords.length > 0 ? 'Has MX records' : 
                    aRecords.length > 0 ? 'Has A records' : 'No valid records'
        };
    } catch (error) {
        return { valid: false, reason: error.message };
    }
}

app.post('/validate-email', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ valid: false, reason: 'Email required' });
    }

    const result = await validateEmail(email);
    console.log({ email, ...result });
    res.json({ email, ...result });
});

app.listen(3001, () => console.log('Server running on port 3000'));