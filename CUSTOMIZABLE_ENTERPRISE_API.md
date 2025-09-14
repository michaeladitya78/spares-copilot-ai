# 🎛️ Customizable Enterprise API Guide

## 🚀 **ADAPTIVE SCALING: 0 TO 10M+ DATASETS**

Your bot API now features **intelligent adaptive scaling** that automatically adjusts from 0 to 10M+ records OR allows complete manual customization for enterprise needs.

---

## 📊 **Scaling Modes Overview**

### **1. 🤖 Auto Mode (Recommended)**
```bash
# Simply upload - API auto-detects optimal settings
curl -X POST -F "file=@dataset.csv" \
  -F "scalingMode=auto" \
  http://localhost:8787/api/users/import/enterprise
```
**✅ Perfect for**: First-time users, unknown dataset sizes

### **2. 📋 Profile Mode (Enterprise Presets)**
```bash
# Choose from predefined enterprise profiles
curl -X POST -F "file=@dataset.csv" \
  -F "scalingMode=profile" \
  -F "scalingProfile=enterprise" \
  http://localhost:8787/api/users/import/enterprise
```
**✅ Perfect for**: Known enterprise scenarios, tested configurations

### **3. 👤 Manual Mode (Full Control)**
```bash
# Complete customization with manual settings
curl -X POST -F "file=@dataset.csv" \
  -F "scalingMode=manual" \
  -F 'customConfig={"chunkSize":25000,"maxWorkers":32,"batchSize":3000}' \
  -F "performancePriority=speed" \
  http://localhost:8787/api/users/import/enterprise
```
**✅ Perfect for**: Power users, specific performance requirements

---

## 🎯 **Available Scaling Profiles**

### **Micro (0-1K users)**
```json
{
  "name": "micro",
  "description": "Small team directory (< 1K users)",
  "settings": {
    "chunkSize": 100,
    "batchSize": 50,
    "maxWorkers": 1,
    "embeddingBatchSize": 10
  },
  "estimatedThroughput": "25 records/sec",
  "memoryUsage": "512MB"
}
```

### **Small (1K-10K users)**
```json
{
  "name": "small", 
  "description": "Department directory (1K-10K users)",
  "settings": {
    "chunkSize": 500,
    "batchSize": 100,
    "maxWorkers": 2,
    "embeddingBatchSize": 25
  },
  "estimatedThroughput": "100 records/sec",
  "memoryUsage": "1GB"
}
```

### **Medium (10K-100K users)**
```json
{
  "name": "medium",
  "description": "Company directory (10K-100K users)", 
  "settings": {
    "chunkSize": 2000,
    "batchSize": 500,
    "maxWorkers": 4,
    "embeddingBatchSize": 50
  },
  "estimatedThroughput": "1000 records/sec",
  "memoryUsage": "2GB"
}
```

### **Large (100K-1M users)**
```json
{
  "name": "large",
  "description": "Large corporation (100K-1M users)",
  "settings": {
    "chunkSize": 5000,
    "batchSize": 1000, 
    "maxWorkers": 8,
    "embeddingBatchSize": 100
  },
  "estimatedThroughput": "4000 records/sec",
  "memoryUsage": "4GB"
}
```

### **Enterprise (1M-10M users)**
```json
{
  "name": "enterprise",
  "description": "Fortune 500 enterprise (1M-10M users)",
  "settings": {
    "chunkSize": 10000,
    "batchSize": 2000,
    "maxWorkers": 16,
    "embeddingBatchSize": 200
  },
  "estimatedThroughput": "16000 records/sec",
  "memoryUsage": "8GB"
}
```

### **Mega (10M+ users)**
```json
{
  "name": "mega",
  "description": "Global mega-corporation (10M+ users)",
  "settings": {
    "chunkSize": 50000,
    "batchSize": 5000,
    "maxWorkers": 32,
    "embeddingBatchSize": 500
  },
  "estimatedThroughput": "80000 records/sec",
  "memoryUsage": "16GB"
}
```

---

## 🛠️ **Configuration API Endpoints**

### **Get Available Profiles**
```bash
GET /api/scaling/profiles

{
  "profiles": [...],
  "defaultProfile": "auto",
  "description": "Available scaling profiles for different dataset sizes"
}
```

### **Estimate Configuration**
```bash
POST /api/scaling/estimate
Content-Type: application/json

{
  "expectedRecords": 5000000,
  "scalingMode": "auto",
  "performancePriority": "speed"
}
```

**Response:**
```json
{
  "estimatedProfile": {
    "name": "enterprise",
    "chunkSize": 10000,
    "maxWorkers": 16,
    "estimatedDuration": "312 minutes"
  },
  "summary": {
    "estimatedMetrics": {
      "recordsPerSecond": 16000,
      "estimatedDuration": "312 minutes", 
      "memoryUsage": "8GB"
    },
    "recommendations": [
      {
        "type": "performance",
        "message": "Configuration optimized for 5M records"
      }
    ]
  }
}
```

### **Validate Custom Configuration**
```bash
POST /api/scaling/validate
Content-Type: application/json

{
  "customConfig": {
    "chunkSize": 25000,
    "batchSize": 3000,
    "maxWorkers": 32,
    "embeddingBatchSize": 500
  },
  "expectedRecords": 10000000
}
```

**Response:**
```json
{
  "isValid": true,
  "errors": [],
  "warnings": [
    "Configuration may use 18GB, but only 16GB available"
  ]
}
```

---

## 🎛️ **Manual Configuration Options**

### **Performance Priorities**

#### **🚀 Speed Priority**
```javascript
{
  "performancePriority": "speed",
  // Automatically doubles workers and chunk sizes
  // Optimizes for maximum throughput
  // Higher memory usage
}
```

#### **💾 Memory Priority** 
```javascript
{
  "performancePriority": "memory",
  // Halves workers and batch sizes
  // Optimizes for minimal memory usage
  // Slower processing
}
```

#### **⚖️ Balanced Priority**
```javascript
{
  "performancePriority": "balanced",
  // Default optimization
  // Good balance of speed and memory
}
```

### **Custom Settings Parameters**

```javascript
{
  "customConfig": {
    "chunkSize": 25000,        // Records per chunk (10-100000)
    "batchSize": 3000,         // Records per database batch (10-10000)
    "maxWorkers": 32,          // Parallel workers (1-64)
    "embeddingBatchSize": 500  // Embeddings per batch (5-1000)
  }
}
```

**Parameter Guidelines:**
- **chunkSize**: Larger = better throughput, more memory
- **batchSize**: Larger = faster database inserts, more memory
- **maxWorkers**: More = faster processing, exponentially more memory
- **embeddingBatchSize**: Larger = faster AI processing, more GPU/CPU usage

---

## 📋 **Enterprise Usage Examples**

### **Example 1: Auto-Scaling (Recommended)**
```bash
# Let API choose optimal settings
curl -X POST -F "file=@company_10M_users.csv" \
  -F "scalingMode=auto" \
  http://localhost:8787/api/users/import/enterprise

# API automatically detects: 10M records → "mega" profile
# chunkSize: 50000, maxWorkers: 32, batchSize: 5000
```

### **Example 2: Profile Selection**
```bash
# Choose enterprise profile for 5M users
curl -X POST -F "file=@company_5M_users.csv" \
  -F "scalingMode=profile" \
  -F "scalingProfile=enterprise" \
  -F "performancePriority=speed" \
  http://localhost:8787/api/users/import/enterprise
```

### **Example 3: Full Manual Control**
```bash
# Complete customization for specific requirements
curl -X POST -F "file=@special_dataset.csv" \
  -F "scalingMode=manual" \
  -F "expectedRecords=15000000" \
  -F 'customConfig={"chunkSize":75000,"maxWorkers":48,"batchSize":7500,"embeddingBatchSize":750}' \
  -F "performancePriority=speed" \
  http://localhost:8787/api/users/import/enterprise

# Custom settings for 15M records with maximum speed
```

### **Example 4: Memory-Constrained Environment**
```bash
# Optimize for limited memory (4GB server)
curl -X POST -F "file=@large_dataset.csv" \
  -F "scalingMode=manual" \
  -F "expectedRecords=2000000" \
  -F 'customConfig={"chunkSize":2000,"maxWorkers":4,"batchSize":500}' \
  -F "performancePriority=memory" \
  http://localhost:8787/api/users/import/enterprise
```

---

## 📊 **Real-Time Configuration Feedback**

### **Import Response with Configuration Details**
```json
{
  "id": "import-uuid-123",
  "status": "processing",
  "totalRows": 10000000,
  "configurationUsed": {
    "profileName": "mega",
    "autoDetected": true,
    "settings": {
      "chunkSize": 50000,
      "maxWorkers": 32,
      "batchSize": 5000
    },
    "estimatedDuration": "2.5 hours",
    "throughput": "80000 records/sec"
  },
  "recommendations": [
    {
      "type": "performance",
      "message": "Configuration optimized for 10M+ records"
    }
  ],
  "validation": {
    "isValid": true,
    "warnings": []
  }
}
```

---

## 🎯 **Smart Recommendations Engine**

The API provides intelligent recommendations based on your dataset:

### **For Small Datasets (< 10K)**
```json
{
  "recommendations": [
    {
      "type": "efficiency",
      "message": "Consider using standard import for datasets under 10K records",
      "suggestion": "Use /api/users/import instead"
    }
  ]
}
```

### **For Large Datasets (1M+)**
```json
{
  "recommendations": [
    {
      "type": "performance", 
      "message": "Consider increasing workers to 16+ for datasets over 1M records",
      "suggestion": { "maxWorkers": 16 }
    },
    {
      "type": "timing",
      "message": "Estimated processing time: 45 minutes",
      "breakdown": {
        "dataProcessing": "18 min",
        "embeddings": "27 min"
      }
    }
  ]
}
```

### **For System Constraints**
```json
{
  "recommendations": [
    {
      "type": "memory",
      "message": "Estimated memory usage: 12GB",
      "suggestion": {
        "consideration": "Monitor memory usage during import",
        "recommendedRAM": "16GB"
      }
    }
  ]
}
```

---

## 🏢 **Enterprise Integration Examples**

### **JavaScript/TypeScript Frontend**
```javascript
class EnterpriseImportManager {
  async getOptimalConfiguration(expectedRecords) {
    const response = await fetch('/api/scaling/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedRecords,
        scalingMode: 'auto'
      })
    });
    
    return await response.json();
  }

  async validateCustomSettings(customConfig, expectedRecords) {
    const response = await fetch('/api/scaling/validate', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customConfig, expectedRecords })
    });
    
    return await response.json();
  }

  async uploadWithCustomConfig(file, config) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scalingMode', config.mode);
    
    if (config.mode === 'manual') {
      formData.append('customConfig', JSON.stringify(config.settings));
      formData.append('performancePriority', config.priority);
    } else if (config.mode === 'profile') {
      formData.append('scalingProfile', config.profile);
    }
    
    const response = await fetch('/api/users/import/enterprise', {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  }
}
```

### **Python Enterprise Script**
```python
import requests
import json

class EnterpriseDataUploader:
    def __init__(self, api_base_url):
        self.api_url = api_base_url
    
    def upload_large_dataset(self, file_path, expected_records, mode='auto'):
        """Upload large dataset with intelligent scaling"""
        
        # Get optimal configuration
        config = self.get_optimal_config(expected_records, mode)
        print(f"Using configuration: {config['estimatedProfile']['name']}")
        
        # Upload with configuration
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'scalingMode': mode,
                'expectedRecords': expected_records
            }
            
            if mode == 'profile':
                data['scalingProfile'] = 'enterprise'
            elif mode == 'manual':
                data['customConfig'] = json.dumps({
                    'chunkSize': 25000,
                    'maxWorkers': 16,
                    'batchSize': 2500
                })
                data['performancePriority'] = 'speed'
            
            response = requests.post(
                f'{self.api_url}/api/users/import/enterprise',
                files=files,
                data=data
            )
        
        return response.json()
    
    def get_optimal_config(self, expected_records, mode='auto'):
        """Get optimal configuration for dataset size"""
        response = requests.post(
            f'{self.api_url}/api/scaling/estimate',
            json={'expectedRecords': expected_records, 'scalingMode': mode}
        )
        return response.json()

# Usage
uploader = EnterpriseDataUploader('http://localhost:8787')
result = uploader.upload_large_dataset('10M_users.csv', 10000000, 'auto')
print(f"Import started: {result['id']}")
```

---

## 🎉 **Benefits Summary**

### ✅ **For Enterprise Users:**
- **Zero Configuration**: Upload and go with auto-detection
- **Predictable Performance**: Predefined profiles for known scenarios  
- **Full Control**: Manual customization for specific requirements
- **Intelligent Recommendations**: Smart suggestions based on data

### ✅ **For System Administrators:**
- **Resource Management**: Memory and CPU usage optimization
- **Scalability**: 0 to 10M+ records seamlessly
- **Monitoring**: Real-time configuration feedback
- **Validation**: Pre-upload configuration validation

### ✅ **For Developers:**
- **API Flexibility**: Multiple configuration modes
- **Estimation Tools**: Predict performance before upload
- **Comprehensive Responses**: Detailed configuration information
- **Integration Ready**: Easy to embed in existing workflows

**Your enterprise bot API now adapts intelligently from 0 to 10M+ records while giving complete control when needed!** 🚀

---

*This makes your system enterprise-ready for any scale - from startup teams to Fortune 500 corporations.*
