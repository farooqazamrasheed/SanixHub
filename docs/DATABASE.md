# SanixHub - Database Design

## MongoDB Schema Design

This document defines all MongoDB collections, schemas, indexes, and relationships for the SanixHub eCommerce platform.

---

## Collections Overview

1. **users** - Customer and admin accounts
2. **products** - Product catalog with details
3. **categories** - Product categorization
4. **orders** - Customer orders and order items
5. **reviews** - Product reviews and ratings
6. **coupons** - Discount codes and rules
7. **inventory** - Stock management and tracking
8. **wishlists** - Customer saved items
9. **carts** - Shopping cart persistence

---

## 1. USERS Collection

Stores customer and admin user accounts with authentication data.

### Schema
```javascript
{
  _id: ObjectId,
  email: String,              // Unique, required
  password: String,           // Bcrypt hashed
  role: String,               // 'customer' | 'superadmin'
  profile: {
    firstName: String,
    lastName: String,
    phone: String,            // Required for order pickup
    whatsapp: String,         // Optional WhatsApp contact
    language: String          // 'en' | 'ur'
  },
  addresses: [{
    label: String,            // 'home', 'work', etc.
    street: String,
    area: String,
    city: String,
    postalCode: String,
    isDefault: Boolean
  }],
  isActive: Boolean,          // Account status
  isVerified: Boolean,        // Email/phone verification
  refreshToken: String,       // For JWT refresh
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ "profile.phone": 1 })
db.users.createIndex({ isActive: 1, role: 1 })
```

### Validation Rules
- Email: Valid format, unique
- Password: Min 8 chars (enforced at API level)
- Phone: Required for customers (Pakistan format)
- Role: Default 'customer', only superadmin can set 'superadmin'

---

## 2. CATEGORIES Collection

Hierarchical product categorization.

### Schema
```javascript
{
  _id: ObjectId,
  name: {
    en: String,               // English name
    ur: String                // Urdu name
  },
  slug: String,               // URL-friendly, unique
  description: {
    en: String,
    ur: String
  },
  parentCategory: ObjectId,   // Ref: categories (null for root)
  image: String,              // Category image URL
  icon: String,               // Icon class or URL
  displayOrder: Number,       // For sorting
  isActive: Boolean,
  seoMeta: {
    title: { en: String, ur: String },
    description: { en: String, ur: String },
    keywords: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Example Categories Structure
```
- Muslim Showers (مسلم شاورز)
- Fittings (فٹنگز)
  - GI Fittings
  - HE Fittings
  - China Fittings
- Water Taps (پانی کے نل)
  - Kitchen Taps
  - Bathroom Taps
- Pipes (پائپس)
  - Plastic Pipes
  - Metal Pipes
- Bath Sets (باتھ سیٹس)
```

### Indexes
```javascript
db.categories.createIndex({ slug: 1 }, { unique: true })
db.categories.createIndex({ parentCategory: 1 })
db.categories.createIndex({ isActive: 1, displayOrder: 1 })
db.categories.createIndex({ "name.en": "text", "name.ur": "text" })
```

---

## 3. PRODUCTS Collection

Complete product catalog with bilingual support.

### Schema
```javascript
{
  _id: ObjectId,
  name: {
    en: String,
    ur: String
  },
  slug: String,               // URL-friendly, unique
  sku: String,                // Stock Keeping Unit, unique
  description: {
    en: String,
    ur: String
  },
  shortDescription: {
    en: String,
    ur: String
  },
  category: ObjectId,         // Ref: categories
  subCategory: ObjectId,      // Ref: categories (optional)
  
  pricing: {
    basePrice: Number,        // Original price in PKR
    salePrice: Number,        // Discounted price (optional)
    discount: Number,         // Percentage off
    taxRate: Number           // Tax percentage
  },
  
  specifications: [{
    key: { en: String, ur: String },
    value: { en: String, ur: String }
  }],
  
  images: [{
    url: String,
    alt: { en: String, ur: String },
    isPrimary: Boolean
  }],
  
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: String              // 'cm', 'inch', 'kg'
  },
  
  tags: [String],             // Searchable tags
  brand: String,
  manufacturer: String,
  origin: String,             // Country of origin
  
  inventory: {
    stockQuantity: Number,
    lowStockThreshold: Number,
    allowBackorder: Boolean,
    trackInventory: Boolean
  },
  
  seo: {
    metaTitle: { en: String, ur: String },
    metaDescription: { en: String, ur: String },
    keywords: [String]
  },
  
  stats: {
    viewCount: Number,
    orderCount: Number,
    rating: Number,           // Calculated average
    reviewCount: Number
  },
  
  isActive: Boolean,
  isFeatured: Boolean,
  isNew: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
db.products.createIndex({ slug: 1 }, { unique: true })
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ category: 1, isActive: 1 })
db.products.createIndex({ isActive: 1, isFeatured: 1 })
db.products.createIndex({ "pricing.salePrice": 1 })
db.products.createIndex({ "stats.rating": -1 })
db.products.createIndex({ tags: 1 })
db.products.createIndex({ 
  "name.en": "text", 
  "name.ur": "text", 
  "description.en": "text",
  "description.ur": "text",
  tags: "text"
}, { 
  weights: { 
    "name.en": 10, 
    "name.ur": 10,
    tags: 5,
    "description.en": 2,
    "description.ur": 2
  }
})
```

---

## 4. ORDERS Collection

Customer orders with lifecycle management.

### Schema
```javascript
{
  _id: ObjectId,
  orderNumber: String,        // Unique, human-readable (SH-2025-0001)
  customer: ObjectId,         // Ref: users
  
  items: [{
    product: ObjectId,        // Ref: products
    productSnapshot: {        // Frozen product data at order time
      name: { en: String, ur: String },
      sku: String,
      image: String,
      price: Number
    },
    quantity: Number,
    price: Number,            // Price at order time
    subtotal: Number
  }],
  
  pricing: {
    subtotal: Number,
    discount: Number,         // From coupon
    tax: Number,
    total: Number
  },
  
  coupon: {
    code: String,
    discountAmount: Number
  },
  
  pickupDetails: {
    customerName: String,
    phone: String,
    whatsapp: String,
    notes: String
  },
  
  status: String,             // 'placed' | 'ready' | 'picked_up' | 'cancelled'
  statusHistory: [{
    status: String,
    timestamp: Date,
    note: String,
    updatedBy: ObjectId       // Ref: users (admin)
  }],
  
  payment: {
    method: String,           // 'cash_on_pickup'
    status: String,           // 'pending' | 'completed'
    paidAt: Date
  },
  
  notes: String,              // Admin notes
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
db.orders.createIndex({ orderNumber: 1 }, { unique: true })
db.orders.createIndex({ customer: 1, createdAt: -1 })
db.orders.createIndex({ status: 1, createdAt: -1 })
db.orders.createIndex({ createdAt: -1 })
db.orders.createIndex({ "items.product": 1 })
```

### Order Status Flow
```
placed → ready → picked_up
   ↓
cancelled (any time before picked_up)
```

---

## 5. REVIEWS Collection

Product reviews and ratings.

### Schema
```javascript
{
  _id: ObjectId,
  product: ObjectId,          // Ref: products
  user: ObjectId,             // Ref: users
  order: ObjectId,            // Ref: orders (optional - verify purchase)
  
  rating: Number,             // 1-5 stars
  title: String,
  comment: String,
  
  images: [String],           // Review images (optional)
  
  isVerified: Boolean,        // Verified purchase
  isApproved: Boolean,        // Admin moderation
  
  helpful: {
    upvotes: Number,
    downvotes: Number
  },
  
  adminResponse: {
    message: String,
    respondedBy: ObjectId,    // Ref: users
    respondedAt: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
db.reviews.createIndex({ product: 1, isApproved: 1, createdAt: -1 })
db.reviews.createIndex({ user: 1 })
db.reviews.createIndex({ isApproved: 1 })
db.reviews.createIndex({ rating: 1 })
```

---

## 6. COUPONS Collection

Discount codes and promotional rules.

### Schema
```javascript
{
  _id: ObjectId,
  code: String,               // Unique, uppercase (SUMMER2025)
  
  type: String,               // 'percentage' | 'fixed'
  value: Number,              // 10 (10% or 10 PKR)
  
  conditions: {
    minOrderValue: Number,
    maxDiscount: Number,      // Cap for percentage discounts
    applicableCategories: [ObjectId],  // Ref: categories
    applicableProducts: [ObjectId],    // Ref: products
    firstOrderOnly: Boolean,
    usageLimit: Number,       // Total usage limit
    usagePerUser: Number      // Per-user limit
  },
  
  validity: {
    startDate: Date,
    endDate: Date
  },
  
  usage: {
    totalUsed: Number,
    usedBy: [{
      user: ObjectId,
      usedCount: Number,
      lastUsed: Date
    }]
  },
  
  isActive: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
db.coupons.createIndex({ code: 1 }, { unique: true })
db.coupons.createIndex({ isActive: 1, "validity.startDate": 1, "validity.endDate": 1 })
```

---

## 7. INVENTORY Collection

Real-time stock tracking and history.

### Schema
```javascript
{
  _id: ObjectId,
  product: ObjectId,          // Ref: products, unique
  
  stock: {
    available: Number,
    reserved: Number,         // In active carts/pending orders
    sold: Number              // Lifetime sales
  },
  
  transactions: [{
    type: String,             // 'restock' | 'sale' | 'adjustment' | 'return'
    quantity: Number,         // +/- value
    order: ObjectId,          // Ref: orders (if sale)
    reason: String,
    performedBy: ObjectId,    // Ref: users (admin)
    timestamp: Date
  }],
  
  alerts: {
    lowStockEnabled: Boolean,
    lowStockThreshold: Number,
    lastAlertSent: Date
  },
  
  updatedAt: Date
}
```

### Indexes
```javascript
db.inventory.createIndex({ product: 1 }, { unique: true })
db.inventory.createIndex({ "stock.available": 1 })
db.inventory.createIndex({ "transactions.timestamp": -1 })
```

---

## 8. CARTS Collection

Persistent shopping cart (saved across sessions).

### Schema
```javascript
{
  _id: ObjectId,
  user: ObjectId,             // Ref: users, unique
  
  items: [{
    product: ObjectId,        // Ref: products
    quantity: Number,
    addedAt: Date
  }],
  
  lastUpdated: Date,
  expiresAt: Date             // Auto-delete after 30 days
}
```

### Indexes
```javascript
db.carts.createIndex({ user: 1 }, { unique: true })
db.carts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
db.carts.createIndex({ "items.product": 1 })
```

---

## 9. WISHLISTS Collection

Customer saved items for later.

### Schema
```javascript
{
  _id: ObjectId,
  user: ObjectId,             // Ref: users, unique
  
  items: [{
    product: ObjectId,        // Ref: products
    addedAt: Date
  }],
  
  updatedAt: Date
}
```

### Indexes
```javascript
db.wishlists.createIndex({ user: 1 }, { unique: true })
db.wishlists.createIndex({ "items.product": 1 })
```

---

## DATABASE RELATIONSHIPS

### Entity Relationship Diagram (ERD)

```
users (1) ──────── (N) orders
users (1) ──────── (1) carts
users (1) ──────── (1) wishlists
users (1) ──────── (N) reviews

products (1) ───── (N) order.items
products (1) ───── (N) reviews
products (1) ───── (1) inventory
products (N) ───── (1) categories

categories (1) ─── (N) categories (self-referencing)

orders (1) ──────── (1) coupons (optional)
```

---

## DATA INTEGRITY RULES

### Application-Level Constraints

1. **Order Creation**:
   - Verify product availability before creating order
   - Reduce inventory stock atomically
   - Create inventory transaction record
   - Update product stats (orderCount)

2. **Product Updates**:
   - Cannot delete product with existing orders (soft delete with isActive)
   - Price changes don't affect past orders (snapshot in order)

3. **Review Submission**:
   - One review per user per product
   - Cannot review without purchase (optional verification)
   - Update product stats (rating, reviewCount) on approval

4. **Coupon Usage**:
   - Validate conditions before applying
   - Increment usage counters atomically
   - Check user-specific and global limits

5. **Inventory Management**:
   - Stock cannot go negative
   - Use MongoDB transactions for multi-document updates
   - Log all stock changes with audit trail

---

## SAMPLE DATA QUERIES

### Get Products with Low Stock
```javascript
db.inventory.aggregate([
  {
    $match: {
      $expr: {
        $lte: ["$stock.available", "$alerts.lowStockThreshold"]
      }
    }
  },
  {
    $lookup: {
      from: "products",
      localField: "product",
      foreignField: "_id",
      as: "productDetails"
    }
  }
])
```

### Get Top Selling Products
```javascript
db.products.find({ isActive: true })
  .sort({ "stats.orderCount": -1 })
  .limit(10)
```

### Get Orders by Status with Customer Info
```javascript
db.orders.aggregate([
  { $match: { status: "placed" } },
  {
    $lookup: {
      from: "users",
      localField: "customer",
      foreignField: "_id",
      as: "customerInfo"
    }
  },
  { $sort: { createdAt: -1 } }
])
```

### Calculate Revenue by Category
```javascript
db.orders.aggregate([
  { $match: { status: "picked_up" } },
  { $unwind: "$items" },
  {
    $lookup: {
      from: "products",
      localField: "items.product",
      foreignField: "_id",
      as: "product"
    }
  },
  { $unwind: "$product" },
  {
    $lookup: {
      from: "categories",
      localField: "product.category",
      foreignField: "_id",
      as: "category"
    }
  },
  { $unwind: "$category" },
  {
    $group: {
      _id: "$category._id",
      categoryName: { $first: "$category.name.en" },
      totalRevenue: { $sum: "$items.subtotal" },
      totalOrders: { $sum: 1 }
    }
  },
  { $sort: { totalRevenue: -1 } }
])
```

---

## BACKUP & MIGRATION STRATEGY

### Backup Schedule
- **Daily**: Automated full backup (MongoDB Atlas automatic)
- **Before Deployment**: Manual backup snapshot
- **Retention**: 30 days of point-in-time recovery

### Migration Scripts
- Version-controlled migration scripts in `/server/migrations/`
- Track applied migrations in `migrations` collection
- Rollback capability for each migration

### Data Seeding
- Development seed data in `/server/seeds/`
- Categories (bilingual)
- Sample products
- Test users (customer + admin)
- Sample orders

---

## PERFORMANCE OPTIMIZATION

### Index Usage Guidelines
1. Index fields used in `find()`, `sort()`, and `$match`
2. Use compound indexes for multi-field queries
3. Monitor slow queries with MongoDB profiler
4. Review index usage with `explain()` plans

### Query Optimization
1. Use projection to limit returned fields
2. Paginate large result sets (skip/limit or cursor-based)
3. Use aggregation pipelines for complex queries
4. Cache frequently accessed data (categories, featured products)

### Data Archival
- Archive orders older than 2 years to separate collection
- Maintain analytics summaries instead of raw data
- Implement TTL indexes for temporary data (carts, sessions)

---

## SECURITY CONSIDERATIONS

### Access Control
- Database user with minimal required permissions
- Read-only user for analytics/reporting
- Never expose database connection string in frontend
- Use environment variables for credentials

### Data Protection
- Encrypt sensitive fields (not needed for this project)
- Never store plain text passwords (bcrypt hashing)
- Sanitize all user inputs before database operations
- Use Mongoose schema validation as first line of defense

### Audit Trail
- Log all admin actions (who, what, when)
- Track order status changes with timestamps
- Maintain inventory transaction history
- Record failed login attempts (future enhancement)

---

**Database design complete. Next: Backend Implementation**
