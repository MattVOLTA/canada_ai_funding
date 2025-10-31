/**
 * Migration Script
 * Parses all markdown reports and imports them into MongoDB Atlas
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FundingReportParser } from './parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection string (from Atlas MCP connection)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cluster0.b4wapis.mongodb.net';
const DB_NAME = 'ai_funding';
const COLLECTION_NAME = 'funding_programs';

async function migrate() {
  let client;

  try {
    console.log('🚀 Starting migration...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB Atlas...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected successfully\n');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Get all markdown report files
    const reportsDir = path.join(__dirname, '../program_reports');
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.endsWith('.md') && f !== '_REGISTRY.md');

    console.log(`📄 Found ${files.length} report files to process\n`);

    let successCount = 0;
    let errorCount = 0;

    // Process each report
    for (const file of files) {
      const filePath = path.join(reportsDir, file);

      try {
        console.log(`Processing: ${file}`);

        // Parse the report
        const parser = new FundingReportParser(filePath);
        const programData = parser.parse();

        if (!programData.program_id || !programData.name) {
          console.log(`  ⚠️  Skipped: Missing required fields (program_id or name)\n`);
          errorCount++;
          continue;
        }

        // Upsert into MongoDB (update if exists, insert if new)
        const result = await collection.updateOne(
          { program_id: programData.program_id },
          { $set: programData },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          console.log(`  ✅ Inserted: ${programData.name} (${programData.program_id})`);
        } else if (result.modifiedCount > 0) {
          console.log(`  ✅ Updated: ${programData.name} (${programData.program_id})`);
        } else {
          console.log(`  ℹ️  No changes: ${programData.name} (${programData.program_id})`);
        }

        successCount++;
        console.log('');

      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error.message);
        errorCount++;
        console.log('');
      }
    }

    // Summary
    console.log('=' .repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Total: ${files.length}`);
    console.log('=' .repeat(50));

    // Create/update indexes
    console.log('\n🔧 Creating indexes...');
    await createIndexes(collection);
    console.log('✅ Indexes created\n');

    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n👋 Connection closed');
    }
  }
}

async function createIndexes(collection) {
  const indexes = [
    { key: { 'status.accepting_applications': 1 }, name: 'status_accepting' },
    { key: { 'status.next_deadline': 1 }, name: 'status_deadline' },
    { key: { 'eligibility.geographic.required_locations': 1 }, name: 'geo_locations' },
    { key: { 'eligibility.entity_types': 1 }, name: 'entity_types' },
    { key: { 'eligibility.sectors.allowed': 1 }, name: 'sectors_allowed' },
    { key: { 'eligibility.stage.allowed': 1 }, name: 'stage_allowed' },
    { key: { 'program_type': 1 }, name: 'program_type' },
    { key: { 'program_id': 1 }, name: 'program_id_unique', unique: true }
  ];

  for (const index of indexes) {
    try {
      await collection.createIndex(index.key, { name: index.name, unique: index.unique || false });
      console.log(`  ✓ ${index.name}`);
    } catch (error) {
      if (error.code === 85) {
        // Index already exists with different options
        console.log(`  ℹ️  ${index.name} (already exists)`);
      } else {
        console.log(`  ⚠️  ${index.name} (error: ${error.message})`);
      }
    }
  }
}

// Run migration
migrate();
