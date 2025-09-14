class AdaptiveScalingService {
  constructor() {
    this.scalingProfiles = {
      // Micro: 0-1K records
      micro: {
        maxRecords: 1000,
        chunkSize: 100,
        batchSize: 50,
        maxWorkers: 1,
        embeddingBatchSize: 10,
        memoryLimit: '512MB',
        description: 'Small team directory (< 1K users)'
      },
      
      // Small: 1K-10K records  
      small: {
        maxRecords: 10000,
        chunkSize: 500,
        batchSize: 100,
        maxWorkers: 2,
        embeddingBatchSize: 25,
        memoryLimit: '1GB',
        description: 'Department directory (1K-10K users)'
      },
      
      // Medium: 10K-100K records
      medium: {
        maxRecords: 100000,
        chunkSize: 2000,
        batchSize: 500,
        maxWorkers: 4,
        embeddingBatchSize: 50,
        memoryLimit: '2GB',
        description: 'Company directory (10K-100K users)'
      },
      
      // Large: 100K-1M records
      large: {
        maxRecords: 1000000,
        chunkSize: 5000,
        batchSize: 1000,
        maxWorkers: 8,
        embeddingBatchSize: 100,
        memoryLimit: '4GB',
        description: 'Large corporation (100K-1M users)'
      },
      
      // Enterprise: 1M-10M records
      enterprise: {
        maxRecords: 10000000,
        chunkSize: 10000,
        batchSize: 2000,
        maxWorkers: 16,
        embeddingBatchSize: 200,
        memoryLimit: '8GB',
        description: 'Fortune 500 enterprise (1M-10M users)'
      },
      
      // Mega: 10M+ records
      mega: {
        maxRecords: 100000000,
        chunkSize: 50000,
        batchSize: 5000,
        maxWorkers: 32,
        embeddingBatchSize: 500,
        memoryLimit: '16GB',
        description: 'Global mega-corporation (10M+ users)'
      }
    };
  }

  detectOptimalProfile(estimatedRecords, fileSize, userPreferences = {}) {
    // Auto-detect based on estimated records
    let autoProfile = 'micro';
    
    if (estimatedRecords > 10000000) autoProfile = 'mega';
    else if (estimatedRecords > 1000000) autoProfile = 'enterprise';
    else if (estimatedRecords > 100000) autoProfile = 'large';
    else if (estimatedRecords > 10000) autoProfile = 'medium';
    else if (estimatedRecords > 1000) autoProfile = 'small';
    
    // Consider file size as backup indicator
    const fileSizeMB = fileSize / (1024 * 1024);
    if (fileSizeMB > 1000 && autoProfile === 'micro') autoProfile = 'enterprise';
    else if (fileSizeMB > 100 && ['micro', 'small'].includes(autoProfile)) autoProfile = 'large';
    
    const baseProfile = this.scalingProfiles[autoProfile];
    
    // Apply user customizations
    const customProfile = {
      ...baseProfile,
      profileName: autoProfile,
      isCustomized: false
    };

    // Allow manual overrides
    if (userPreferences.chunkSize) {
      customProfile.chunkSize = Math.min(userPreferences.chunkSize, 100000);
      customProfile.isCustomized = true;
    }
    
    if (userPreferences.batchSize) {
      customProfile.batchSize = Math.min(userPreferences.batchSize, 10000);
      customProfile.isCustomized = true;
    }
    
    if (userPreferences.maxWorkers) {
      customProfile.maxWorkers = Math.min(userPreferences.maxWorkers, 64);
      customProfile.isCustomized = true;
    }
    
    if (userPreferences.embeddingBatchSize) {
      customProfile.embeddingBatchSize = Math.min(userPreferences.embeddingBatchSize, 1000);
      customProfile.isCustomized = true;
    }

    // Smart adjustments based on system resources
    const systemMemoryGB = this.getSystemMemoryGB();
    if (customProfile.maxWorkers * 512 > systemMemoryGB * 1024) {
      customProfile.maxWorkers = Math.max(1, Math.floor(systemMemoryGB * 2));
      customProfile.isCustomized = true;
      customProfile.adjustmentReason = 'Reduced workers due to system memory limits';
    }

    return customProfile;
  }

  getScalingRecommendations(estimatedRecords, currentProfile) {
    const recommendations = [];
    
    // Performance recommendations
    if (estimatedRecords > 1000000 && currentProfile.maxWorkers < 8) {
      recommendations.push({
        type: 'performance',
        message: 'Consider increasing workers to 8+ for datasets over 1M records',
        suggestion: { maxWorkers: 16 }
      });
    }
    
    if (estimatedRecords > 100000 && currentProfile.chunkSize < 5000) {
      recommendations.push({
        type: 'performance', 
        message: 'Larger chunk sizes improve throughput for big datasets',
        suggestion: { chunkSize: 10000 }
      });
    }
    
    // Memory recommendations
    const estimatedMemoryMB = (currentProfile.maxWorkers * 256) + (estimatedRecords * 0.001);
    if (estimatedMemoryMB > 4096) {
      recommendations.push({
        type: 'memory',
        message: `Estimated memory usage: ${Math.round(estimatedMemoryMB)}MB`,
        suggestion: { 
          consideration: 'Monitor memory usage during import',
          recommendedRAM: `${Math.ceil(estimatedMemoryMB / 1024)}GB`
        }
      });
    }
    
    // Time estimates
    const estimatedTimeMinutes = estimatedRecords / (currentProfile.batchSize * currentProfile.maxWorkers * 0.5);
    recommendations.push({
      type: 'timing',
      message: `Estimated processing time: ${Math.round(estimatedTimeMinutes)} minutes`,
      breakdown: {
        dataProcessing: `${Math.round(estimatedTimeMinutes * 0.4)} min`,
        embeddings: `${Math.round(estimatedTimeMinutes * 0.6)} min`
      }
    });
    
    return recommendations;
  }

  createCustomProfile(userConfig) {
    const {
      expectedRecords = 0,
      performancePriority = 'balanced', // 'speed', 'memory', 'balanced'
      customSettings = {}
    } = userConfig;

    // Start with auto-detected profile
    let baseProfile = this.detectOptimalProfile(expectedRecords, 0);
    
    // Apply performance priority adjustments
    switch (performancePriority) {
      case 'speed':
        baseProfile.maxWorkers = Math.min(baseProfile.maxWorkers * 2, 32);
        baseProfile.chunkSize = Math.min(baseProfile.chunkSize * 2, 50000);
        baseProfile.batchSize = Math.min(baseProfile.batchSize * 1.5, 5000);
        break;
        
      case 'memory':
        baseProfile.maxWorkers = Math.max(Math.floor(baseProfile.maxWorkers / 2), 1);
        baseProfile.chunkSize = Math.max(Math.floor(baseProfile.chunkSize / 2), 100);
        baseProfile.embeddingBatchSize = Math.max(Math.floor(baseProfile.embeddingBatchSize / 2), 5);
        break;
        
      case 'balanced':
      default:
        // Keep base profile as-is
        break;
    }
    
    // Apply any custom overrides
    const customProfile = {
      ...baseProfile,
      ...customSettings,
      profileName: 'custom',
      isCustomized: true,
      performancePriority,
      createdAt: new Date().toISOString()
    };
    
    return customProfile;
  }

  validateProfile(profile, systemConstraints = {}) {
    const errors = [];
    const warnings = [];
    
    // Validate worker count
    if (profile.maxWorkers > 64) {
      errors.push('Maximum workers cannot exceed 64');
    }
    
    if (profile.maxWorkers < 1) {
      errors.push('Must have at least 1 worker');
    }
    
    // Validate chunk size
    if (profile.chunkSize > 100000) {
      errors.push('Chunk size cannot exceed 100,000 records');
    }
    
    if (profile.chunkSize < 10) {
      errors.push('Chunk size must be at least 10 records');
    }
    
    // Validate batch size
    if (profile.batchSize > profile.chunkSize) {
      warnings.push('Batch size should not exceed chunk size');
    }
    
    // System resource checks
    const systemMemoryGB = systemConstraints.memoryGB || this.getSystemMemoryGB();
    const estimatedMemoryGB = (profile.maxWorkers * 0.5) + 2; // Base estimate
    
    if (estimatedMemoryGB > systemMemoryGB * 0.8) {
      warnings.push(`Configuration may use ${estimatedMemoryGB}GB, but only ${systemMemoryGB}GB available`);
    }
    
    return { errors, warnings, isValid: errors.length === 0 };
  }

  getSystemMemoryGB() {
    // Get available system memory (simplified for demo)
    const totalMemoryBytes = require('os').totalmem();
    return Math.round(totalMemoryBytes / (1024 * 1024 * 1024));
  }

  generateProfileSummary(profile, estimatedRecords) {
    const recommendations = this.getScalingRecommendations(estimatedRecords, profile);
    const validation = this.validateProfile(profile);
    
    return {
      profile: {
        name: profile.profileName || 'custom',
        description: profile.description || 'Custom configuration',
        settings: {
          chunkSize: profile.chunkSize,
          batchSize: profile.batchSize,
          maxWorkers: profile.maxWorkers,
          embeddingBatchSize: profile.embeddingBatchSize
        },
        isCustomized: profile.isCustomized || false
      },
      estimatedMetrics: {
        recordsPerSecond: Math.round(profile.batchSize * profile.maxWorkers * 0.5),
        estimatedDuration: `${Math.round(estimatedRecords / (profile.batchSize * profile.maxWorkers * 0.5))} minutes`,
        memoryUsage: `${Math.round((profile.maxWorkers * 0.5) + 2)}GB`,
        concurrentProcessing: `${profile.maxWorkers} workers`
      },
      recommendations,
      validation,
      systemInfo: {
        availableMemory: `${this.getSystemMemoryGB()}GB`,
        optimalForRecords: this.getOptimalRange(profile)
      }
    };
  }

  getOptimalRange(profile) {
    const throughput = profile.batchSize * profile.maxWorkers * 0.5; // records per second
    const minOptimal = throughput * 60; // 1 minute minimum
    const maxOptimal = throughput * 3600; // 1 hour maximum
    
    return {
      min: Math.round(minOptimal),
      max: Math.round(maxOptimal),
      description: `Optimized for ${Math.round(minOptimal/1000)}K - ${Math.round(maxOptimal/1000)}K records`
    };
  }

  getAllProfiles() {
    return Object.entries(this.scalingProfiles).map(([name, profile]) => ({
      name,
      ...profile,
      estimatedThroughput: `${Math.round(profile.batchSize * profile.maxWorkers * 0.5)} records/sec`
    }));
  }
}

export default AdaptiveScalingService;
