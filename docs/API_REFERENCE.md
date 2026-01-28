# SanixHub API Reference

Complete API documentation for the SanixHub eCommerce platform.

**Base URL**: `http://localhost:5000/api` (development)

---

## Authentication

### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+923001234567",
    "language": "en"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

---

## Products

### Get All Products
```http
GET /api/products?page=1&limit=20&category={id}&search={query}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `category` - Filter by category ID
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Text search
- `sort` - Sort field (e.g., `-createdAt`, `pricing.salePrice`)
- `featured` - Filter featured products (true/false)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [ /* array of products */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Get Single Product
```http
GET /api/products/:slug
```

### Create Product (Admin)
```http
POST /api/products
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": {
    "en": "Premium Muslim Shower",
    "ur": "پریمیم مسلم شاور"
  },
  "slug": "premium-muslim-shower",
  "sku": "MS-001",
  "description": {
    "en": "High quality Muslim shower",
    "ur": "اعلیٰ معیار کا مسلم شاور"
  },
  "category": "category_id",
  "pricing": {
    "basePrice": 2500,
    "salePrice": 2000
  },
  "inventory": {
    "stockQuantity": 100,
    "lowStockThreshold": 10
  },
  "images": [
    {
      "url": "/uploads/product.jpg",
      "isPrimary": true
    }
  ]
}
```

---

## Orders

### Create Order
```http
POST /api/orders
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "items": [
    {
      "product": "product_id",
      "quantity": 2
    }
  ],
  "couponCode": "SUMMER2025",
  "pickupDetails": {
    "customerName": "John Doe",
    "phone": "+923001234567",
    "notes": "Please call before preparing"
  }
}
```

### Get My Orders
```http
GET /api/orders?page=1&status=placed
Authorization: Bearer {token}
```

### Cancel Order
```http
PUT /api/orders/:id/cancel
Authorization: Bearer {token}
```

---

## Categories

### Get All Categories
```http
GET /api/categories
```

### Get Category Tree
```http
GET /api/categories/tree
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "cat_id",
        "name": { "en": "Fittings", "ur": "فٹنگز" },
        "slug": "fittings",
        "children": [ /* subcategories */ ]
      }
    ]
  }
}
```

---

## Admin Endpoints

### Get Dashboard Stats
```http
GET /api/admin/dashboard
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": {
      "total": 1000,
      "active": 950,
      "lowStock": 15
    },
    "orders": {
      "total": 500,
      "today": 12,
      "placed": 8,
      "ready": 4
    },
    "customers": 250,
    "revenue": {
      "last30Days": 250000,
      "ordersCount": 150,
      "averageOrderValue": 1667
    }
  }
}
```

### Update Order Status
```http
PUT /api/admin/orders/:id/status
Authorization: Bearer {admin_token}
```

**Request Body:**
```json
{
  "status": "ready",
  "note": "Order is ready for pickup"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": null
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400) - Invalid input data
- `UNAUTHORIZED` (401) - Missing or invalid token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `SERVER_ERROR` (500) - Internal server error

---

**Full API reference with all endpoints available in the codebase.**
