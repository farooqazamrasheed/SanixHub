# SanixHub - System Architecture

## 1. PROJECT OVERVIEW

SanixHub is a **production-grade eCommerce platform** designed for a sanitary and plumbing products business in Pakistan. This is NOT a demo or tutorial—this is a real business system built to handle:

- **1000+ products** across multiple categories
- **Multi-role access**: Customers and Super Admin with RBAC
- **Bilingual support**: English and Urdu
- **Local payment model**: Cash on Pickup
- **Order lifecycle**: Placed → Ready → Picked Up
- **SEO optimization** for organic Google traffic
- **WhatsApp integration** for customer support and ordering

### Business Goals
1. Replace manual/offline ordering with automated online system
2. Enable customers to browse, search, and place orders 24/7
3. Provide admin tools for inventory, orders, and analytics
4. Scale from local to nationwide operations
5. Drive organic traffic through SEO

---

## 2. TECHNOLOGY STACK

### Frontend
- **Framework**: Next.js 14 (React 18) - For SSR, SSG, and SEO
- **Styling**: Tailwind CSS + Framer Motion - For responsive design and animations
- **State Management**: Zustand + React Query - For client state and server caching
- **Forms**: React Hook Form + Zod - For validation
- **i18n**: next-i18next - For English/Urdu support
- **SEO**: next-seo - For metadata management

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.18+
- **API Architecture**: RESTful with resource-based routing
- **Authentication**: JWT (Access + Refresh tokens)
- **Authorization**: Role-Based Access Control (RBAC)
- **Validation**: express-validator
- **Security**: helmet, express-rate-limit, mongo-sanitize, xss-clean

### Database
- **Primary DB**: MongoDB 7.0+
- **ODM**: Mongoose 8.0+
- **Indexing Strategy**: Compound indexes on frequently queried fields
- **Data Integrity**: Schema validation + application-level constraints

### DevOps & Tools
- **Version Control**: Git
- **Environment Management**: dotenv
- **Image Processing**: Sharp
- **File Upload**: Multer
- **Logging**: Morgan + Winston (production)
- **Process Management**: PM2 (production)
- **Reverse Proxy**: Nginx (production)

---

## 3. SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │    Admin     │  │   Mobile     │      │
│  │  (Next.js)   │  │  Dashboard   │  │  (Future)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │   NGINX/CDN     │
                    │  (SSL, Cache)   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                                     │
┌─────────▼─────────────────────────────────────▼─────────┐
│                    API LAYER (Express.js)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │Product Service│  │Order Service │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ User Service │  │Review Service │  │Coupon Service│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │        Middleware Layer                        │    │
│  │  - Authentication (JWT)                        │    │
│  │  - Authorization (RBAC)                        │    │
│  │  - Rate Limiting                               │    │
│  │  - Request Validation                          │    │
│  │  - Error Handling                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────┘
                          │
                ┌─────────▼─────────┐
                │   MongoDB Atlas   │
                │  (Primary Store)  │
                │                   │
                │  - Users          │
                │  - Products       │
                │  - Orders         │
                │  - Inventory      │
                │  - Reviews        │
                │  - Categories     │
                │  - Coupons        │
                └───────────────────┘
```

### Data Flow Architecture

#### **Customer Order Flow**
```
Customer → Search/Browse Products → View Details & Reviews 
       → Add to Cart → Review Cart → Place Order (COD)
       → Receive Confirmation → Track Order Status
       → Pick Up Order → Rate & Review
```

#### **Admin Management Flow**
```
Admin Login → Dashboard → Manage Products/Inventory
          → Process Orders (Mark Ready/Picked Up)
          → Manage Coupons → View Analytics
          → Moderate Reviews
```

#### **Request Flow (Technical)**
```
1. Client sends HTTP request
2. Nginx handles SSL termination & load balancing
3. Express middleware chain:
   - CORS validation
   - Rate limiting
   - Body parsing
   - Security headers (Helmet)
   - JWT authentication
   - RBAC authorization
   - Input validation & sanitization
4. Route handler executes business logic
5. Service layer interacts with database
6. Response formatted and returned
7. Client updates UI
```

---

## 4. SECURITY ARCHITECTURE

### Authentication Strategy
- **JWT-based authentication** with access and refresh tokens
- Access token: 15 minutes expiry (stored in httpOnly cookie)
- Refresh token: 7 days expiry (stored in httpOnly cookie)
- Secure, SameSite=Strict cookies in production

### Authorization (RBAC)
```
Roles:
├── customer (default)
│   ├── Browse products
│   ├── Place orders
│   ├── View own orders
│   ├── Write reviews
│   └── Update profile
│
└── superadmin
    ├── All customer permissions
    ├── Product CRUD
    ├── Inventory management
    ├── Order management (all orders)
    ├── User management
    ├── Coupon management
    ├── Review moderation
    └── Analytics access
```

### Security Measures
1. **Input Validation**: express-validator on all inputs
2. **Sanitization**: mongo-sanitize, xss-clean
3. **Rate Limiting**: 100 requests/15 minutes per IP
4. **Password Security**: bcrypt with 12 rounds
5. **HTTP Headers**: Helmet.js for security headers
6. **CORS**: Whitelist allowed origins
7. **File Upload**: Type and size validation
8. **SQL/NoSQL Injection**: Mongoose escaping + sanitization
9. **XSS Protection**: Content Security Policy
10. **HTTPS**: Enforced in production

---

## 5. SCALABILITY CONSIDERATIONS

### Current Scale (Local)
- Expected: 100-500 concurrent users
- Orders: ~50-200 per day
- Products: 1000+

### Nationwide Scale (Future)
- Expected: 5,000-10,000 concurrent users
- Orders: ~1,000-5,000 per day
- Products: 5,000+

### Scaling Strategy

#### Phase 1 (Current): Vertical Scaling
- Single server deployment
- MongoDB Atlas (M10 cluster)
- CDN for static assets

#### Phase 2 (Growth): Horizontal Scaling
- Load balancer with 2-3 app servers
- MongoDB replica set (3 nodes)
- Redis for session caching
- Separate image/file storage (S3/CloudStorage)

#### Phase 3 (National): Distributed System
- Microservices architecture
- Message queue (RabbitMQ/Redis)
- Elasticsearch for product search
- Separate analytics DB
- Multi-region CDN
- Auto-scaling groups

### Performance Optimizations
1. **Database**:
   - Compound indexes on search fields
   - Pagination for large datasets
   - Aggregation pipelines for analytics
   - Connection pooling

2. **API**:
   - Response compression (gzip)
   - API response caching (Redis)
   - Query result caching
   - Lazy loading for images

3. **Frontend**:
   - Next.js Static Site Generation (SSG) for product pages
   - Incremental Static Regeneration (ISR)
   - Image optimization (next/image + Sharp)
   - Code splitting
   - Prefetching for navigation

---

## 6. MONITORING & OBSERVABILITY

### Logging Strategy
- **Development**: Morgan (console)
- **Production**: Winston (file + cloud logging)
- Log levels: error, warn, info, debug
- Structured logging with request IDs

### Metrics to Track
1. **Business Metrics**:
   - Orders per day/week/month
   - Revenue trends
   - Product views vs. orders (conversion)
   - Cart abandonment rate
   - Average order value

2. **Technical Metrics**:
   - API response times
   - Database query performance
   - Error rates (4xx, 5xx)
   - Server resource usage (CPU, Memory)
   - Uptime percentage

3. **User Metrics**:
   - Active users
   - Session duration
   - Bounce rate
   - Popular products/categories
   - Search queries

### Health Checks
- `/health` endpoint for uptime monitoring
- Database connection status
- External service status (if any)

---

## 7. ERROR HANDLING STRATEGY

### Error Types
1. **Validation Errors** (400): Invalid input
2. **Authentication Errors** (401): Invalid/expired token
3. **Authorization Errors** (403): Insufficient permissions
4. **Not Found Errors** (404): Resource doesn't exist
5. **Conflict Errors** (409): Duplicate resource
6. **Server Errors** (500): Unexpected failures

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "The requested product does not exist",
    "details": null,
    "timestamp": "2025-12-28T03:17:42Z"
  }
}
```

### Error Handling Flow
1. Errors caught in async handlers
2. Classified by type
3. Logged with context
4. User-friendly message returned
5. Stack traces hidden in production
6. Critical errors trigger alerts

---

## 8. DEPLOYMENT ARCHITECTURE

### Development Environment
```
Developer Machine
├── Node.js 20
├── MongoDB local or Atlas
└── Next.js dev server
```

### Production Environment
```
VPS/Cloud Server (DigitalOcean/AWS/Azure)
├── Ubuntu 22.04 LTS
├── Nginx (reverse proxy + SSL)
├── PM2 (process management)
├── Node.js 20
└── MongoDB Atlas (managed)
```

### CI/CD Pipeline (Future)
```
Git Push → GitHub Actions → Run Tests → Build → Deploy to Server → Health Check
```

---

## ARCHITECTURAL DECISIONS RATIONALE

### Why Next.js over Create React App?
- **SSR/SSG**: Critical for SEO (Google ranking requirement)
- **Performance**: Better Core Web Vitals out of the box
- **Routing**: File-based routing is cleaner
- **API Routes**: Can handle simple backend tasks
- **Image Optimization**: Built-in optimization

### Why MongoDB over PostgreSQL?
- **Flexible Schema**: Product attributes vary significantly
- **JSON Storage**: Natural fit for eCommerce (nested data)
- **Horizontal Scaling**: Easier to shard for future growth
- **Developer Speed**: Faster iteration on schema changes

### Why JWT over Sessions?
- **Stateless**: Easier to scale horizontally
- **Mobile-Friendly**: Future mobile app integration
- **Microservices-Ready**: Token-based auth works across services

### Why Separate Frontend/Backend?
- **Team Independence**: Frontend and backend teams can work in parallel
- **Deployment Flexibility**: Can deploy/scale independently
- **API Reusability**: Same API can serve web, mobile, partners
- **Technology Freedom**: Can replace frontend framework without backend changes

---

## NEXT STEPS

This architecture document provides the foundation. The following documents detail:

1. **DATABASE.md**: Complete MongoDB schemas with indexes
2. **API.md**: Full API specification with routes and examples
3. **FRONTEND.md**: Component structure and UX patterns
4. **DEPLOYMENT.md**: Step-by-step deployment instructions
5. **SECURITY.md**: Security best practices and checklists

---

*Architecture reviewed and approved for production deployment.*
