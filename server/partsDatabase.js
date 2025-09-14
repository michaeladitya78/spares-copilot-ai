import fs from 'fs';
import path from 'path';

class PartsDatabase {
  constructor() {
    this.dbPath = path.join(process.cwd(), 'server', 'parts.json');
    this.loadDatabase();
  }

  loadDatabase() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf8');
      this.parts = JSON.parse(data);
    } catch (error) {
      // Initialize with mock data if file doesn't exist
      this.parts = [
        {
          id: "1",
          partNumber: "BRG-X75-001",
          name: "Bearing Model X-75",
          machine: "Assembly Line A",
          inStock: true,
          quantity: 4,
          warranty: true,
          warrantyDate: "October 2026",
          imageUrl: "/placeholder.svg",
          isFeatured: false,
          location: "Site A",
          lastUpdated: new Date().toISOString(),
          requestCount: 0,
          features: []
        },
        {
          id: "2",
          partNumber: "MTR-V200-002",
          name: "Motor Drive V200",
          machine: "Packaging Unit B",
          inStock: false,
          quantity: 0,
          warranty: true,
          warrantyDate: "March 2025",
          imageUrl: "/placeholder.svg",
          isFeatured: false,
          location: "Site A",
          lastUpdated: new Date().toISOString(),
          requestCount: 0,
          features: []
        },
        {
          id: "3",
          partNumber: "SEN-P450-003",
          name: "Proximity Sensor P450",
          machine: "Quality Control Station",
          inStock: true,
          quantity: 12,
          warranty: false,
          warrantyDate: null,
          imageUrl: "/placeholder.svg",
          isFeatured: false,
          location: "Site A",
          lastUpdated: new Date().toISOString(),
          requestCount: 0,
          features: []
        }
      ];
      this.saveDatabase();
    }
  }

  saveDatabase() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.parts, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  getAllParts() {
    return this.parts;
  }

  getPartById(id) {
    return this.parts.find(part => part.id === id);
  }

  getPartByNumber(partNumber) {
    return this.parts.find(part => part.partNumber === partNumber);
  }

  searchParts(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.parts.filter(part => 
      part.name.toLowerCase().includes(lowercaseQuery) ||
      part.partNumber.toLowerCase().includes(lowercaseQuery) ||
      part.machine.toLowerCase().includes(lowercaseQuery)
    );
  }

  updatePartQuantity(partId, newQuantity) {
    const part = this.getPartById(partId);
    if (part) {
      part.quantity = newQuantity;
      part.inStock = newQuantity > 0;
      part.lastUpdated = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  markPartAsFeatured(partId, isFeatured = true) {
    const part = this.getPartById(partId);
    if (part) {
      part.isFeatured = isFeatured;
      part.lastUpdated = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  addPartFeature(partId, feature) {
    const part = this.getPartById(partId);
    if (part) {
      if (!part.features) {
        part.features = [];
      }
      if (!part.features.includes(feature)) {
        part.features.push(feature);
        part.lastUpdated = new Date().toISOString();
        this.saveDatabase();
      }
      return true;
    }
    return false;
  }

  removePartFeature(partId, feature) {
    const part = this.getPartById(partId);
    if (part && part.features) {
      part.features = part.features.filter(f => f !== feature);
      part.lastUpdated = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  incrementRequestCount(partId) {
    const part = this.getPartById(partId);
    if (part) {
      part.requestCount = (part.requestCount || 0) + 1;
      part.lastUpdated = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  getFeaturedParts() {
    return this.parts.filter(part => part.isFeatured);
  }

  getLowStockParts(threshold = 5) {
    return this.parts.filter(part => part.inStock && part.quantity <= threshold);
  }

  addPart(partData) {
    const newPart = {
      id: Date.now().toString(),
      ...partData,
      isFeatured: false,
      lastUpdated: new Date().toISOString(),
      requestCount: 0,
      features: []
    };
    this.parts.push(newPart);
    this.saveDatabase();
    return newPart;
  }

  updatePart(partId, updates) {
    const partIndex = this.parts.findIndex(part => part.id === partId);
    if (partIndex !== -1) {
      this.parts[partIndex] = {
        ...this.parts[partIndex],
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      this.saveDatabase();
      return this.parts[partIndex];
    }
    return null;
  }

  deletePart(partId) {
    const partIndex = this.parts.findIndex(part => part.id === partId);
    if (partIndex !== -1) {
      const deletedPart = this.parts.splice(partIndex, 1)[0];
      this.saveDatabase();
      return deletedPart;
    }
    return null;
  }
}

export default PartsDatabase;
