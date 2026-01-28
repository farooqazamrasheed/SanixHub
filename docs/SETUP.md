# SanixHub - Complete Setup Guide

## Quick Start (5 Minutes)

For developers who want to get started immediately:

```bash
# 1. Clone and install
git clone https://github.com/your-repo/sanixhub.git
cd sanixhub
npm install
cd client && npm install && cd ..

# 2. Setup environment
cp .env.example .env
cd client && cp .env.local.example .env.local && cd ..

# 3. Start MongoDB (if local)
sudo systemctl start mongodb

# 4. Create admin user
node server/seeds/createAdmin.js

# 5. Run application
npm run dev
```

Open http://localhost:3000 and login with admin@sanixhub.com / Admin123!@#

---

## Detailed Setup Instructions

### Project Structure

```
sanixhub/
├── server/                 # Backend (Node.js/Express)
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── utils/             # Helper functions
│   ├── seeds/             # Database seeds
│   └── server.js          # Entry point
│
├── client/                # Frontend (Next.js/React)
│   ├── components/        # React components
│   ├── pages/             # Next.js pages
│   ├── lib/               # API client & utilities
│   ├── store/             # State management (Zustand)
│   ├── styles/            # Global styles
│   └── public/            # Static assets
│
├── docs/                  # Documentation
├── package.json           # Backend dependencies
└── .env                   # Environment variables
```

### Environment Variables Explained

**Backend (.env):**

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development / production |
| PORT | Backend server port | 5000 |
| CLIENT_URL | Frontend URL (CORS) | http://localhost:3000 |
| MONGODB_URI | Database connection | mongodb://localhost:27017/sanixhub |
| JWT_ACCESS_SECRET | JWT access token secret | random_string_min_32_chars |
| JWT_REFRESH_SECRET | JWT refresh token secret | random_string_min_32_chars |
| JWT_ACCESS_EXPIRES_IN | Access token expiry | 15m |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiry | 7d |
| ADMIN_EMAIL | Default admin email | admin@sanixhub.com |
| ADMIN_PASSWORD | Default admin password | Admin123!@# |

**Frontend (client/.env.local):**

| Variable | Description | Example |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:5000/api |
| NEXT_PUBLIC_SITE_URL | Frontend URL | http://localhost:3000 |
| NEXT_PUBLIC_SITE_NAME | Site name | SanixHub |
| NEXT_PUBLIC_WHATSAPP_NUMBER | WhatsApp contact | +92xxxxxxxxxx |

### Available Scripts

**Root (Backend):**
```bash
npm run dev              # Run both frontend and backend
npm run server:dev       # Run backend only
npm run client:dev       # Run frontend only
npm start                # Run backend (production)
npm test                 # Run tests
npm run lint             # Run linter
```

**Frontend (client/):**
```bash
npm run dev              # Development server
npm run build            # Production build
npm start                # Production server
npm run lint             # Run linter
```

---

## Database Seeding

### Create Sample Categories

Create `server/seeds/seedCategories.js`:

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const connectDatabase = require('../config/database');

const categories = [
  {
    name: { en: 'Muslim Showers', ur: 'مسلم شاورز' },
    slug: 'muslim-showers',
    description: { en: 'High-quality Muslim showers for bathrooms', ur: 'باتھ رومز کے لیے اعلیٰ معیار کے مسلم شاورز' },
    displayOrder: 1,
    isActive: true
  },
  // Add more categories...
];

async function seedCategories() {
  await connectDatabase();
  
  for (const cat of categories) {
    const exists = await Category.findOne({ slug: cat.slug });
    if (!exists) {
      await Category.create(cat);
      console.log(`✅ Created category: ${cat.name.en}`);
    }
  }
  
  console.log('✅ Categories seeded');
  process.exit(0);
}

seedCategories().catch(err => {
  console.error('Error seeding categories:', err);
  process.exit(1);
});
```

Run: `node server/seeds/seedCategories.js`

---

## API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/logout            # Logout
POST   /api/auth/refresh           # Refresh access token
GET    /api/auth/me                # Get current user
PUT    /api/auth/profile           # Update profile
PUT    /api/auth/change-password   # Change password
```

### Product Endpoints

```
GET    /api/products               # Get all products (with filters)
GET    /api/products/:slug         # Get single product
POST   /api/products               # Create product (Admin)
PUT    /api/products/:id           # Update product (Admin)
DELETE /api/products/:id           # Delete product (Admin)
GET    /api/products/:id/related   # Get related products
```

### Order Endpoints

```
POST   /api/orders                 # Create order
GET    /api/orders                 # Get user's orders
GET    /api/orders/:id             # Get single order
PUT    /api/orders/:id/cancel      # Cancel order
```

### Category Endpoints

```
GET    /api/categories             # Get all categories
GET    /api/categories/tree        # Get category tree
GET    /api/categories/:slug       # Get single category
POST   /api/categories             # Create category (Admin)
PUT    /api/categories/:id         # Update category (Admin)
DELETE /api/categories/:id         # Delete category (Admin)
```

### Admin Endpoints

```
GET    /api/admin/dashboard        # Dashboard stats
GET    /api/admin/orders           # All orders
PUT    /api/admin/orders/:id/status # Update order status
GET    /api/admin/reviews          # All reviews
PUT    /api/admin/reviews/:id/approve # Approve/reject review
GET    /api/admin/coupons          # All coupons
POST   /api/admin/coupons          # Create coupon
PUT    /api/admin/coupons/:id      # Update coupon
DELETE /api/admin/coupons/:id      # Delete coupon
GET    /api/admin/inventory/low-stock # Low stock products
PUT    /api/admin/inventory/:productId # Update inventory
```

---

## Testing the Application

### Manual Testing Checklist

**User Flow:**
1. ✅ Register new account
2. ✅ Login successfully
3. ✅ Browse products
4. ✅ Search products
5. ✅ Filter by category/price
6. ✅ View product details
7. ✅ Add to cart
8. ✅ Update cart quantities
9. ✅ Apply coupon code
10. ✅ Place order
11. ✅ View order history
12. ✅ Write product review

**Admin Flow:**
1. ✅ Login as admin
2. ✅ View dashboard
3. ✅ Create category
4. ✅ Create product
5. ✅ Update inventory
6. ✅ View orders
7. ✅ Update order status
8. ✅ Moderate reviews
9. ✅ Create coupon

### API Testing with cURL

**Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "profile": {
      "firstName": "Test",
      "lastName": "User",
      "phone": "+923001234567"
    }
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sanixhub.com",
    "password": "Admin123!@#"
  }'
```

**Get Products:**
```bash
curl http://localhost:5000/api/products
```

---

## Development Tips

### Hot Reload

Both frontend and backend support hot reload during development:
- Backend: Uses `nodemon` to restart on file changes
- Frontend: Next.js dev server with Fast Refresh

### Debugging

**Backend:**
```javascript
// Add to any route
console.log('Debug:', variable);
```

**Frontend:**
```javascript
// React DevTools available in browser
console.log('Debug:', state);
```

**VS Code Debug Config** `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "server:dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Code Quality

**ESLint:**
```bash
npm run lint
```

**Format Code:**
Install Prettier extension in VS Code and enable format on save.

---

## Common Development Scenarios

### Adding a New API Endpoint

1. Create controller in `server/controllers/`
2. Add route in `server/routes/`
3. Register route in `server/server.js`
4. Add API function in `client/lib/api.ts`
5. Test endpoint

### Adding a New Page

1. Create page in `client/pages/`
2. Add translations if needed
3. Implement components
4. Add navigation link
5. Test page

### Adding a New Database Model

1. Create model in `server/models/`
2. Add validation and indexes
3. Update related controllers
4. Create migration if needed
5. Update API documentation

---

## Troubleshooting

### "Cannot find module"
```bash
npm install
cd client && npm install
```

### Port already in use
```bash
# Kill process on port 5000
sudo lsof -t -i:5000 | xargs kill -9
```

### MongoDB connection failed
- Check MongoDB is running
- Verify connection string
- Check network access (for Atlas)

### Next.js build errors
```bash
cd client
rm -rf .next node_modules
npm install
npm run dev
```

---

**Setup complete! Happy coding! 🚀**