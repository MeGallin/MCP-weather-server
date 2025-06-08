import { describe, test, expect } from '@jest/globals';
import {
  validateMCPRequest,
  validateEndpointParams,
  validateAuthRequest,
  sanitizeInput,
  isValidIP,
  validateCoordinates
} from '../../utils/validation.js';

describe('MCP Request Validation', () => {
  test('should validate valid MCP request', () => {
    const validRequest = {
      input: {
        endpointName: 'getWeather',
        queryParams: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      },
      tools: [],
      metadata: {}
    };    const result = validateMCPRequest(validRequest);
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual(validRequest);
  });

  test('should reject MCP request without input', () => {
    const invalidRequest = {
      tools: [],
      metadata: {}
    };

    const result = validateMCPRequest(invalidRequest);
    expect(result.error).toBeDefined();
    expect(result.error.details[0].message).toContain('input');
  });

  test('should reject MCP request without endpointName', () => {
    const invalidRequest = {
      input: {
        queryParams: {}
      }
    };

    const result = validateMCPRequest(invalidRequest);
    expect(result.error).toBeDefined();
    expect(result.error.details[0].message).toContain('endpointName');
  });
});

describe('Endpoint Parameter Validation', () => {
  describe('Weather Endpoints', () => {
    test('should validate valid weather parameters', () => {
      const params = {
        latitude: 40.7128,
        longitude: -74.0060,
        current_weather: true
      };

      const result = validateEndpointParams('getWeather', params);
      expect(result.error).toBeNull();
      expect(result.value.latitude).toBe(40.7128);
      expect(result.value.longitude).toBe(-74.0060);
    });

    test('should reject invalid latitude', () => {
      const params = {
        latitude: 95, // Invalid: > 90
        longitude: -74.0060
      };

      const result = validateEndpointParams('getWeather', params);
      expect(result.error).toBeDefined();
      expect(result.details[0].message).toContain('90 degrees');
    });

    test('should reject invalid longitude', () => {
      const params = {
        latitude: 40.7128,
        longitude: 185 // Invalid: > 180
      };

      const result = validateEndpointParams('getWeather', params);
      expect(result.error).toBeDefined();
      expect(result.details[0].message).toContain('180 degrees');
    });

    test('should apply default values', () => {
      const params = {
        latitude: 40.7128,
        longitude: -74.0060
      };

      const result = validateEndpointParams('getWeather', params);
      expect(result.error).toBeNull();
      expect(result.value.current_weather).toBe(true);
      expect(result.value.temperature_unit).toBe('celsius');
    });

    test('should validate temperature units', () => {
      const params = {
        latitude: 40.7128,
        longitude: -74.0060,
        temperature_unit: 'fahrenheit'
      };

      const result = validateEndpointParams('getWeather', params);
      expect(result.error).toBeNull();
      expect(result.value.temperature_unit).toBe('fahrenheit');
    });

    test('should reject invalid temperature unit', () => {
      const params = {
        latitude: 40.7128,
        longitude: -74.0060,
        temperature_unit: 'kelvin'
      };

      const result = validateEndpointParams('getWeather', params);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Endpoints', () => {
    test('should validate user parameters with defaults', () => {
      const params = {};

      const result = validateEndpointParams('getUsers', params);
      expect(result.error).toBeNull();
      expect(result.value._limit).toBe(10);
      expect(result.value._page).toBe(1);
      expect(result.value._order).toBe('asc');
    });

    test('should reject invalid limit', () => {
      const params = {
        _limit: 150 // > 100
      };

      const result = validateEndpointParams('getUsers', params);
      expect(result.error).toBeDefined();
      expect(result.details[0].message).toContain('100');
    });

    test('should validate sorting parameters', () => {
      const params = {
        _sort: 'name',
        _order: 'desc'
      };

      const result = validateEndpointParams('getUsers', params);
      expect(result.error).toBeNull();
      expect(result.value._sort).toBe('name');
      expect(result.value._order).toBe('desc');
    });
  });

  describe('Unknown Endpoints', () => {
    test('should handle unknown endpoints gracefully', () => {
      const params = { someParam: 'value' };

      const result = validateEndpointParams('unknownEndpoint', params);
      expect(result.error).toBeNull();
      expect(result.warnings).toBeDefined();
      expect(result.warnings[0]).toContain('No validation schema');
    });
  });
});

describe('Authentication Validation', () => {
  test('should validate login request', () => {
    const loginData = {
      username: 'testuser',
      password: 'password123'
    };    const result = validateAuthRequest('login', loginData);
    expect(result.error).toBeUndefined();
    expect(result.value.username).toBe('testuser');
    expect(result.value.remember).toBe(false); // default
  });

  test('should reject short username', () => {
    const loginData = {
      username: 'ab', // too short
      password: 'password123'
    };

    const result = validateAuthRequest('login', loginData);
    expect(result.error).toBeDefined();
    expect(result.error.details[0].message).toContain('3 characters');
  });

  test('should reject short password', () => {
    const loginData = {
      username: 'testuser',
      password: '123' // too short
    };

    const result = validateAuthRequest('login', loginData);
    expect(result.error).toBeDefined();
    expect(result.error.details[0].message).toContain('6 characters');
  });

  test('should validate API key creation', () => {
    const apiKeyData = {
      name: 'Test API Key',
      permissions: ['read', 'write']
    };    const result = validateAuthRequest('apiKey', apiKeyData);
    expect(result.error).toBeUndefined();
    expect(result.value.permissions).toEqual(['read', 'write']);
    expect(result.value.expiresIn).toBe('30d'); // default
  });
});

describe('Input Sanitization', () => {
  test('should sanitize HTML/XSS attempts', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
  });

  test('should sanitize SQL injection attempts', () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const sanitized = sanitizeInput(maliciousInput);
    
    expect(sanitized).not.toContain('DROP');
    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain("'");
  });

  test('should handle nested objects', () => {
    const input = {
      user: {
        name: '<script>alert("xss")</script>',
        age: 25
      },
      tags: ['<b>tag1</b>', 'tag2']
    };

    const sanitized = sanitizeInput(input);
    expect(sanitized.user.name).not.toContain('<script>');
    expect(sanitized.user.age).toBe(25);
    expect(sanitized.tags[0]).not.toContain('<b>');
  });

  test('should respect maxLength option', () => {
    const longString = 'a'.repeat(1000);
    const sanitized = sanitizeInput(longString, { maxLength: 100 });
    
    expect(sanitized.length).toBe(100);
  });

  test('should allow HTML when configured', () => {
    const htmlInput = '<p>This is <b>bold</b> text</p>';
    const sanitized = sanitizeInput(htmlInput, { 
      allowHtml: true,
      allowedTags: ['p', 'b']
    });
    
    expect(sanitized).toContain('<p>');
    expect(sanitized).toContain('<b>');
  });
});

describe('IP Validation', () => {
  test('should validate IPv4 addresses', () => {
    expect(isValidIP('192.168.1.1')).toBe(true);
    expect(isValidIP('10.0.0.1')).toBe(true);
    expect(isValidIP('127.0.0.1')).toBe(true);
  });

  test('should reject invalid IPv4 addresses', () => {
    expect(isValidIP('256.1.1.1')).toBe(false);
    expect(isValidIP('192.168.1')).toBe(false);
    expect(isValidIP('192.168.1.1.1')).toBe(false);
  });

  test('should validate IPv6 addresses', () => {
    expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(isValidIP('2001:db8:85a3::8a2e:370:7334')).toBe(false); // abbreviated form not implemented
  });

  test('should reject invalid formats', () => {
    expect(isValidIP('not-an-ip')).toBe(false);
    expect(isValidIP('')).toBe(false);
    expect(isValidIP('192.168.1.256')).toBe(false);
  });
});

describe('Coordinate Validation', () => {
  test('should validate correct coordinates', () => {
    const result = validateCoordinates(40.7128, -74.0060);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.normalizedLat).toBeCloseTo(40.7128);
    expect(result.normalizedLon).toBeCloseTo(-74.0060);
  });

  test('should reject invalid latitude', () => {
    const result = validateCoordinates(95, -74.0060);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Latitude must be between -90 and 90 degrees');
  });

  test('should reject invalid longitude', () => {
    const result = validateCoordinates(40.7128, 185);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Longitude must be between -180 and 180 degrees');
  });

  test('should provide precision warnings', () => {
    const result = validateCoordinates(0.000001, 0.000001);
    
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('precision');
  });

  test('should normalize coordinates', () => {
    const result = validateCoordinates(40.71283456789, -74.00604567890);
    
    expect(result.normalizedLat).toBe(40.712835);
    expect(result.normalizedLon).toBe(-74.006046);
  });

  test('should warn about equator/prime meridian intersection', () => {
    const result = validateCoordinates(0.5, 0.5);
    
    expect(result.warnings).toContain('Coordinates appear to be near the equator/prime meridian intersection');
  });
});
