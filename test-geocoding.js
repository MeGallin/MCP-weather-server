#!/usr/bin/env node

/**
 * Test the geocoding API directly to understand the issue
 */

import axios from 'axios';

async function testGeocoding() {
  console.log('🌍 Testing geocoding API...\n');

  const locations = [
    'London,UK',
    'London',
    'London, United Kingdom',
    'London, England',
    'New York',
    'Paris',
  ];

  for (const location of locations) {
    try {
      console.log(`Testing: "${location}"`);

      const response = await axios.get(
        'https://geocoding-api.open-meteo.com/v1/search',
        {
          params: {
            name: location,
            count: 1,
            language: 'en',
            format: 'json',
          },
          timeout: 5000,
        },
      );

      if (response.data?.results?.[0]) {
        const result = response.data.results[0];
        console.log(
          `✅ Found: ${result.name}, ${result.country} (${result.latitude}, ${result.longitude})`,
        );
      } else {
        console.log(`❌ Not found`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

testGeocoding();
