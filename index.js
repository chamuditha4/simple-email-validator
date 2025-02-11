const express = require('express');
const dns = require('dns').promises;
const net = require('net');

const app = express();
app.use(express.json());

async function quickValidateEmail(email) {
    // Basic format check first (fastest)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, reason: 'Invalid format' };
    }

    const [, domain] = email.split('@');

    try {
        // Quick MX check with short timeout
        const mxRecords = await dns.resolveMx(domain).catch(() => []);
        if (!mxRecords.length) {
            return { valid: false, reason: 'No MX records' };
        }

        // Quick SMTP check with 3 second timeout
        const isValid = await checkSMTP(mxRecords[0].exchange, email);
        return {
            valid: isValid,
            reason: isValid ? 'Valid' : 'SMTP check failed'
        };

    } catch (error) {
        return { valid: false, reason: error.message };
    }
}

function checkSMTP(host, email) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        // Shorter timeout - 3 seconds
        socket.setTimeout(3000);

        socket.on('timeout', () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(false);
            }
        });

        socket.on('error', () => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        });

        socket.connect(25, host, () => {
            // As soon as we connect, we consider it valid
            // This is less thorough but much faster
            resolved = true;
            socket.destroy();
            resolve(true);
        });
    });
}

app.post('/validate-email', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ valid: false, reason: 'Email required' });
    }

    const result = await quickValidateEmail(email);
    res.json({ email, ...result });
});

app.listen(3000, () => console.log('Server running on port 3000'));