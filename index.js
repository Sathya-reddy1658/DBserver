import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3000;

// Supabase configuration
const supabaseUrl = 'https://yymvzwupfugsjctnzksh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bXZ6d3VwZnVnc2pjdG56a3NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTA0MTE2MCwiZXhwIjoyMDQwNjE3MTYwfQ.q9FfJ-MxXsQEbSd5w_5KessCuTfKgWQCvd6sw_sKc0U'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// API endpoints
const WAVE_API_URL = 'https://sarat.incois.gov.in/incoismobileappdata/rest/incois/hwassalatestdata';
const CURRENT_API_URL = 'https://samudra.incois.gov.in/incoismobileappdata/rest/incois/currentslatestdata';
const TSUNAMI_API_URL = 'https://thingproxy.freeboard.io/fetch/https://tsunami.incois.gov.in/itews/DSSProducts/OPR/past90days.json';

// Helper function to extract numeric values from strings
const extractNumber = (str) => {
  const match = str.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
};

// Function to fetch data from an API
const fetchApiData = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error.message);
    return null;
  }
};

// Fetch tsunami data
const fetchTsunamiData = async () => {
  try {
    const response = await axios.get(TSUNAMI_API_URL);
    return response.data.datasets || [];
  } catch (error) {
    console.error('Error fetching tsunami data:', error.message);
    throw new Error('Failed to fetch tsunami data');
  }
};

// Function to clear the table before inserting data
const clearTable = async (tableName) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 0); // Deletes all rows
    if (error) throw error;
    console.log(`Cleared table: ${tableName}`);
  } catch (error) {
    console.error(`Error clearing table ${tableName}:`, error.message);
  }
};

// Function to insert high wave alerts into the database
const insertHighWaveAlerts = async (alerts) => {
  await clearTable('highwave');
  for (const alert of alerts) {
    try {
      const { data, error } = await supabase
        .from('highwave')
        .insert({
          district: alert.District,
          hw_message: alert.Message
        });

      if (error) throw error;
      console.log(`Inserted high wave alert for ${alert.District}`);
    } catch (error) {
      console.error('Error inserting high wave alert:', error.message);
    }
  }
};

// Function to insert swell surge alerts into the database
const insertSwellSurgeAlerts = async (alerts) => {
  await clearTable('swellsurge');
  for (const alert of alerts) {
    try {
      const { data, error } = await supabase
        .from('swellsurge')
        .insert({
          district: alert.District,
          ss_message: alert.Message
        });

      if (error) throw error;
      console.log(`Inserted swell surge alert for ${alert.District}`);
    } catch (error) {
      console.error('Error inserting swell surge alert:', error.message);
    }
  }
};

// Function to insert current speed alerts into the database
const insertCurrentSpeedAlerts = async (alerts) => {
  await clearTable('oceancurrent');
  for (const alert of alerts) {
    try {
      const { data, error } = await supabase
        .from('oceancurrent')
        .insert({
          district: alert.District,
          oc_message: alert.Message
        });

      if (error) throw error;
      console.log(`Inserted current speed alert for ${alert.District}`);
    } catch (error) {
      console.error('Error inserting current speed alert:', error.message);
    }
  }
};

// Function to insert tsunami data into the database
const insertTsunamiData = async (tsunamiEvents) => {
  await clearTable('tsunami');
  for (const event of tsunamiEvents) {
    const { REGION, LATITUDE, LONGITUDE, ORIGINTIME, MAGNITUDE } = event;

    try {
      const { data, error } = await supabase
        .from('tsunami')
        .insert({
          region: REGION || 'Unknown',
          lat: parseFloat(LATITUDE),
          long: parseFloat(LONGITUDE),
          event_date: ORIGINTIME ? new Date(ORIGINTIME) : null,
          magnitude: parseFloat(MAGNITUDE)
        });

      if (error) throw error;
      console.log(`Inserted tsunami data for region: ${REGION}`);
    } catch (error) {
      console.error('Error inserting tsunami data:', error.message);
    }
  }
};

// Main function to fetch and process alerts
const fetchAndProcessAlerts = async () => {
  console.log('Starting alert fetch and processing...');

  const waveData = await fetchApiData(WAVE_API_URL);
  const currentData = await fetchApiData(CURRENT_API_URL);
  const tsunamiData = await fetchTsunamiData();

  if (!waveData || !currentData || !tsunamiData) {
    console.error('Failed to fetch data from one or more APIs');
    return;
  }

  const highWaveAlerts = JSON.parse(waveData.HWAJson || '[]');
  const swellSurgeAlerts = JSON.parse(waveData.SSAJson || '[]');
  const currentSpeedAlerts = JSON.parse(currentData.CurrentsJson || '[]');

  await insertHighWaveAlerts(highWaveAlerts);
  await insertSwellSurgeAlerts(swellSurgeAlerts);
  await insertCurrentSpeedAlerts(currentSpeedAlerts);
  await insertTsunamiData(tsunamiData);

  console.log('Alert processing and database insertion completed.');
};

// Schedule the task to run every hour
setInterval(fetchAndProcessAlerts,3600000); 

// Example route to test the server
app.get('/test', (req, res) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Initial fetch and process when the server starts
fetchAndProcessAlerts();
