import multer from 'multer';
import csv from 'fast-csv';
import ExcelJS from 'exceljs';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import path from 'path';
import fs from 'fs';

class ImportService {
  constructor(database, aiProvider) {
    this.db = database;
    this.ai = aiProvider;
    this.uploadDir = path.join(process.cwd(), 'uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Configure multer for file uploads
    this.upload = multer({
      dest: this.uploadDir,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/json'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only CSV, Excel, and JSON files are allowed.'));
        }
      }
    });

    // Active import jobs
    this.activeImports = new Map();
  }

  async importFromFile(filePath, options = {}) {
    const importId = Date.now().toString();
    const fileExtension = path.extname(filePath).toLowerCase();
    
    const importStatus = {
      id: importId,
      status: 'processing',
      totalRows: 0,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      errors: [],
      startTime: new Date(),
      endTime: null
    };

    this.activeImports.set(importId, importStatus);

    try {
      let users;
      
      if (fileExtension === '.csv') {
        users = await this.parseCSV(filePath, options);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        users = await this.parseExcel(filePath, options);
      } else if (fileExtension === '.json') {
        users = await this.parseJSON(filePath, options);
      } else {
        throw new Error('Unsupported file format');
      }

      importStatus.totalRows = users.length;

      // Process users in batches
      const batchSize = options.batchSize || 100;
      const batches = this.chunkArray(users, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          // Insert users
          const insertedUsers = await this.db.bulkInsertUsers(batch);
          
          // Generate embeddings for inserted users
          await this.generateUserEmbeddings(insertedUsers);
          
          importStatus.successRows += insertedUsers.length;
          importStatus.processedRows += batch.length;
          
          console.log(`✅ Processed batch ${i + 1}/${batches.length} (${insertedUsers.length} users)`);
          
        } catch (batchError) {
          console.error(`❌ Error processing batch ${i + 1}:`, batchError);
          importStatus.errorRows += batch.length;
          importStatus.errors.push({
            batch: i + 1,
            error: batchError.message,
            users: batch.length
          });
        }
      }

      importStatus.status = 'completed';
      importStatus.endTime = new Date();
      
      console.log(`🎉 Import completed: ${importStatus.successRows}/${importStatus.totalRows} users imported successfully`);
      
      return importStatus;

    } catch (error) {
      console.error('Import error:', error);
      importStatus.status = 'failed';
      importStatus.endTime = new Date();
      importStatus.errors.push({
        general: error.message
      });
      
      throw error;
    } finally {
      // Cleanup uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
    }
  }

  async parseCSV(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const users = [];
      const headers = options.headers || this.getDefaultHeaders();
      
      createReadStream(filePath)
        .pipe(csv.parse({ 
          headers: true, 
          ignoreEmpty: true,
          trim: true 
        }))
        .on('data', (row) => {
          try {
            const user = this.normalizeUserData(row, headers);
            if (user) users.push(user);
          } catch (error) {
            console.warn('Skipping invalid row:', error.message);
          }
        })
        .on('end', () => {
          console.log(`📊 Parsed ${users.length} users from CSV`);
          resolve(users);
        })
        .on('error', reject);
    });
  }

  async parseExcel(filePath, options = {}) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(options.sheetName || 1);
    const users = [];
    const headers = options.headers || this.getDefaultHeaders();
    
    // Get header row
    const headerRow = worksheet.getRow(1);
    const columnMap = {};
    
    headerRow.eachCell((cell, colNumber) => {
      columnMap[colNumber] = cell.value?.toString().toLowerCase().trim();
    });

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      try {
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const columnName = columnMap[colNumber];
          if (columnName) {
            rowData[columnName] = cell.value?.toString().trim();
          }
        });
        
        const user = this.normalizeUserData(rowData, headers);
        if (user) users.push(user);
        
      } catch (error) {
        console.warn(`Skipping invalid row ${rowNumber}:`, error.message);
      }
    });

    console.log(`📊 Parsed ${users.length} users from Excel`);
    return users;
  }

  async parseJSON(filePath, options = {}) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const users = [];
    const headers = options.headers || this.getDefaultHeaders();
    
    const dataArray = Array.isArray(data) ? data : [data];
    
    for (const item of dataArray) {
      try {
        const user = this.normalizeUserData(item, headers);
        if (user) users.push(user);
      } catch (error) {
        console.warn('Skipping invalid item:', error.message);
      }
    }

    console.log(`📊 Parsed ${users.length} users from JSON`);
    return users;
  }

  normalizeUserData(rawData, headers) {
    const user = {};
    
    // Map common field variations to standard fields
    const fieldMappings = {
      name: ['name', 'full_name', 'fullname', 'user_name', 'username', 'display_name'],
      email: ['email', 'email_address', 'mail', 'e_mail'],
      role: ['role', 'position', 'job_title', 'title', 'designation'],
      department: ['department', 'dept', 'division', 'team', 'group'],
      skills: ['skills', 'expertise', 'competencies', 'technologies'],
      bio: ['bio', 'biography', 'description', 'about', 'summary'],
      phone: ['phone', 'phone_number', 'mobile', 'contact'],
      location: ['location', 'office', 'site', 'city', 'address']
    };

    // Normalize field names and extract data
    for (const [standardField, variations] of Object.entries(fieldMappings)) {
      for (const variation of variations) {
        const value = rawData[variation] || rawData[variation.toLowerCase()] || rawData[variation.toUpperCase()];
        if (value && value.toString().trim()) {
          user[standardField] = value.toString().trim();
          break;
        }
      }
    }

    // Validation
    if (!user.name) {
      throw new Error('Name field is required');
    }

    // Add metadata for any additional fields
    user.metadata = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (!Object.values(fieldMappings).flat().includes(key.toLowerCase()) && value) {
        user.metadata[key] = value.toString().trim();
      }
    }

    return user;
  }

  async generateUserEmbeddings(users) {
    for (const user of users) {
      try {
        // Generate embeddings for different content types
        const contentTypes = [
          {
            type: 'profile',
            content: `${user.name} works as ${user.role || 'unknown role'} in ${user.department || 'unknown department'}`
          },
          {
            type: 'skills',
            content: user.skills || ''
          },
          {
            type: 'bio',
            content: user.bio || ''
          }
        ];

        for (const { type, content } of contentTypes) {
          if (content.trim()) {
            const embedding = await this.ai.generateEmbedding(content);
            await this.db.insertUserVector(user.id, type, content, embedding);
          }
        }

      } catch (error) {
        console.error(`Failed to generate embeddings for user ${user.id}:`, error);
      }
    }
  }

  getDefaultHeaders() {
    return ['name', 'email', 'role', 'department', 'skills', 'bio', 'phone', 'location'];
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  getImportStatus(importId) {
    return this.activeImports.get(importId) || null;
  }

  getAllImportStatuses() {
    return Array.from(this.activeImports.values());
  }

  async createSampleCSV() {
    const sampleData = [
      {
        name: 'John Doe',
        email: 'john.doe@company.com',
        role: 'Senior Engineer',
        department: 'Engineering',
        skills: 'JavaScript, Python, React, Node.js',
        bio: 'Experienced full-stack developer with 8 years in web development',
        phone: '+1-555-0123',
        location: 'New York, NY'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        role: 'Product Manager',
        department: 'Product',
        skills: 'Product Strategy, Analytics, Scrum, Leadership',
        bio: 'Product manager focused on user experience and data-driven decisions',
        phone: '+1-555-0124',
        location: 'San Francisco, CA'
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@company.com',
        role: 'DevOps Engineer',
        department: 'Infrastructure',
        skills: 'AWS, Docker, Kubernetes, Terraform, CI/CD',
        bio: 'DevOps specialist with expertise in cloud infrastructure and automation',
        phone: '+1-555-0125',
        location: 'Seattle, WA'
      }
    ];

    const csvPath = path.join(this.uploadDir, 'sample_users.csv');
    
    return new Promise((resolve, reject) => {
      csv.writeToPath(csvPath, sampleData, { headers: true })
        .on('finish', () => resolve(csvPath))
        .on('error', reject);
    });
  }
}

export default ImportService;
