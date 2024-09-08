import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3000;

// Replace these with your actual Supabase URL and key
const supabaseUrl = 'https://yymvzwupfugsjctnzksh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bXZ6d3VwZnVnc2pjdG56a3NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTA0MTE2MCwiZXhwIjoyMDQwNjE3MTYwfQ.q9FfJ-MxXsQEbSd5w_5KessCuTfKgWQCvd6sw_sKc0U'; // Replace with your actual Supabase key
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to extract high wave and swell surge data
const extractWaveData = (message) => {
    const highWaveMatch = message.match(/High waves?\s*in\s*the\s*range\s*of\s*([\d.]+)\s*-\s*([\d.]+)\s*m/i);
    const highWave = highWaveMatch ? ((parseFloat(highWaveMatch[1]) + parseFloat(highWaveMatch[2])) / 2).toFixed(1) : 'N/A';

    const swellSurgeMatch = message.match(/Swell waves? in the range of \d+\.?\d* - \d+\.?\d* sec period with (\d+\.?\d*) - (\d+\.?\d*) m height/i);
    const swellSurge = swellSurgeMatch ? parseFloat(swellSurgeMatch[1]) : 'N/A';

    return { highWave, swellSurge };
};

// Function to extract current speed data
const extractCurrentSpeed = (message) => {
    const match = message.match(/Surface current speeds in the range of (\d+\.\d+)\s*-\s*(\d+\.\d+)\s*m\/sec/i);
    if (match) {
        const minSpeed = parseFloat(match[1]);
        const maxSpeed = parseFloat(match[2]);
        return ((minSpeed + maxSpeed) / 2).toFixed(1); // Average speed
    }
    return 'N/A';
};

// Fetch and update alerts
const updateAlerts = async () => {
    try {
        console.log('Starting alert update...');

        // Fetch wave alerts
        const { data: waveData, error: waveError } = await axios.get('https://sarat.incois.gov.in/incoismobileappdata/rest/incois/hwassalatestdata');
        if (waveError) {
            console.error('Error fetching wave data:', waveError.message);
            return;
        }

        console.log('Wave Data:', waveData); // Log API response

        const highWaveAlerts = JSON.parse(waveData.HWAJson);
        const swellSurgeAlerts = JSON.parse(waveData.SSAJson);

        console.log('High Wave Alerts:', highWaveAlerts); // Log parsed data
        console.log('Swell Surge Alerts:', swellSurgeAlerts);

        // Process and insert high wave and swell surge alerts
        for (const alert of [...highWaveAlerts, ...swellSurgeAlerts]) {
            const { highWave, swellSurge } = extractWaveData(alert.Message);

            const { data: dbData, error: dbError } = await supabase
                .from('alerts')
                .upsert({
                    district: alert.District,
                    alert_type: 'high_wave', // or 'swell_surge'
                    alert_description: alert.Alert,
                    color: alert.Color,
                    issue_date: new Date(alert['Issue Date']),
                    high_wave: highWave,
                    swell_surge: swellSurge,
                    message: alert.Message,
                }, { onConflict: ['district', 'alert_type', 'issue_date'] });

            if (dbError) {
                console.error('Database Error:', dbError.message);
                return;
            }

            console.log('Inserted/Updated data:', dbData); // Log inserted/updated data
        }

        // Fetch current speed alerts
        const { data: currentSpeedData, error: currentSpeedError } = await axios.get('https://samudra.incois.gov.in/incoismobileappdata/rest/incois/currentslatestdata');
        if (currentSpeedError) {
            console.error('Error fetching current speed data:', currentSpeedError.message);
            return;
        }

        console.log('Current Speed Data:', currentSpeedData); // Log API response

        const currentSpeedAlerts = JSON.parse(currentSpeedData.CurrentsJson);

        console.log('Current Speed Alerts:', currentSpeedAlerts); // Log parsed data

        // Process and insert current speed alerts
        for (const alert of currentSpeedAlerts) {
            const currentSpeed = extractCurrentSpeed(alert.Message);

            const { data: dbData, error: dbError } = await supabase
                .from('alerts')
                .upsert({
                    district: alert.District,
                    alert_type: 'current_speed',
                    alert_description: alert.Alert,
                    color: alert.Color,
                    issue_date: new Date(alert['Issue Date']),
                    current_speed: currentSpeed,
                    message: alert.Message,
                }, { onConflict: ['district', 'alert_type', 'issue_date'] });

            if (dbError) {
                console.error('Database Error:', dbError.message);
                return;
            }

            console.log('Inserted/Updated data:', dbData); // Log inserted/updated data
        }
    } catch (error) {
        console.error('Error updating alerts:', error.message);
    }
};

// Set up a periodic task to fetch and update alerts
setInterval(updateAlerts, 5 * 60 * 1000); // Run every 5 minutes

// Example route to fetch data from Supabase
app.get('/fetch-data', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('alerts')
            .select('*');

        if (error) {
            console.error('Error fetching data:', error.message);
            res.status(500).send('Internal Server Error');
            return;
        }

        res.json(data);
    } catch (error) {
        console.error('Error in /fetch-data route:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
