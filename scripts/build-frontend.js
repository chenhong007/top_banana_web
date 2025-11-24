/**
 * Build script for frontend-only static export
 * Temporarily excludes admin and API routes during build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_DIR = path.join(__dirname, '../app');
const ADMIN_DIR = path.join(APP_DIR, '(admin)');
const API_DIR = path.join(APP_DIR, 'api');
const TEMP_DIR = path.join(__dirname, '../temp_exclude');

// Backup directory names
const ADMIN_BACKUP = path.join(TEMP_DIR, '(admin)');
const API_BACKUP = path.join(TEMP_DIR, 'api');

console.log('🚀 Starting frontend-only build process...\n');

// Step 1: Create temp directory
console.log('📁 Creating temporary backup directory...');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Step 2: Move admin and api directories
console.log('📦 Moving admin and API directories to temporary location...');
try {
  if (fs.existsSync(ADMIN_DIR)) {
    fs.renameSync(ADMIN_DIR, ADMIN_BACKUP);
    console.log('   ✓ Moved app/(admin)');
  }
  if (fs.existsSync(API_DIR)) {
    fs.renameSync(API_DIR, API_BACKUP);
    console.log('   ✓ Moved app/api');
  }
} catch (error) {
  console.error('❌ Error moving directories:', error.message);
  restoreDirectories();
  process.exit(1);
}

// Step 3: Build the project
console.log('\n🔨 Building static frontend...');
try {
  execSync('next build', {
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_DEPLOY_ENV: 'frontend' }
  });
  console.log('\n✅ Build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  restoreDirectories();
  process.exit(1);
}

// Step 4: Restore directories
console.log('\n📂 Restoring admin and API directories...');
restoreDirectories();

console.log('\n🎉 Frontend build completed! Static files are in the "out" directory.');
console.log('📝 See DEPLOYMENT.md for deployment instructions.');

// Helper function to restore directories
function restoreDirectories() {
  try {
    if (fs.existsSync(ADMIN_BACKUP)) {
      fs.renameSync(ADMIN_BACKUP, ADMIN_DIR);
      console.log('   ✓ Restored app/(admin)');
    }
    if (fs.existsSync(API_BACKUP)) {
      fs.renameSync(API_BACKUP, API_DIR);
      console.log('   ✓ Restored app/api');
    }
    // Clean up temp directory if empty
    if (fs.existsSync(TEMP_DIR) && fs.readdirSync(TEMP_DIR).length === 0) {
      fs.rmdirSync(TEMP_DIR);
    }
  } catch (error) {
    console.error('⚠️  Warning: Error restoring directories:', error.message);
    console.error('   Please manually move directories back from temp_exclude/');
  }
}

