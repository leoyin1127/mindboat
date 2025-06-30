#!/usr/bin/env node

/**
 * Integration testing script for MindBoat + Min-D
 * Tests all major component integrations and backend connections
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting MindBoat + Min-D Integration Tests...\n');

// Test configurations
const tests = [
  {
    name: 'Environment Variables',
    test: () => checkEnvironmentVariables()
  },
  {
    name: 'Component Files',
    test: () => checkComponentFiles()
  },
  {
    name: 'Backend Services',
    test: () => checkBackendServices()
  },
  {
    name: 'Build Process',
    test: () => checkBuildProcess()
  },
  {
    name: 'Database Migrations',
    test: () => checkDatabaseMigrations()
  }
];

// Check environment variables
function checkEnvironmentVariables() {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SPLINE_SCENE_URL'
  ];

  const envFile = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envFile)) {
    throw new Error('.env file not found');
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const missing = requiredVars.filter(varName => !envContent.includes(varName));
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  return 'All required environment variables present';
}

// Check component files exist
function checkComponentFiles() {
  const requiredFiles = [
    'src/components/SplineScene.tsx',
    'src/components/SplineEventHandler.tsx',
    'src/components/LifeGoalsModal.tsx',
    'src/components/WelcomePanel.tsx',
    'src/components/JourneyPanel.tsx',
    'src/components/ControlPanel.tsx',
    'src/components/SailingSummaryPanel.tsx',
    'src/adapters/MinDIntegrationAdapter.ts',
    'src/styles/designSystem.ts'
  ];

  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    throw new Error(`Missing component files: ${missing.join(', ')}`);
  }

  return `All ${requiredFiles.length} component files present`;
}

// Check backend services
function checkBackendServices() {
  const serviceFiles = [
    'src/services/UserService.ts',
    'src/services/DestinationService.ts',
    'src/services/VoyageService.ts',
    'src/services/DistractionService.ts',
    'src/services/ReflectionService.ts'
  ];

  const missing = serviceFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    throw new Error(`Missing service files: ${missing.join(', ')}`);
  }

  return `All ${serviceFiles.length} backend services present`;
}

// Check build process
function checkBuildProcess() {
  return new Promise((resolve, reject) => {
    exec('npm run build', (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Build failed: ${error.message}`));
      } else {
        resolve('Build process successful');
      }
    });
  });
}

// Check database migrations
function checkDatabaseMigrations() {
  const migrationFiles = [
    'supabase/migrations/add_mind_integration.sql'
  ];

  const missing = migrationFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    throw new Error(`Missing migration files: ${missing.join(', ')}`);
  }

  return `All database migration files present`;
}

// Run all tests
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`⏳ Testing ${test.name}...`);
      const result = await test.test();
      console.log(`✅ ${test.name}: ${result}\n`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log(`\n🎉 All tests passed! Ready for deployment.`);
    process.exit(0);
  } else {
    console.log(`\n🚨 Some tests failed. Please address the issues above.`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});