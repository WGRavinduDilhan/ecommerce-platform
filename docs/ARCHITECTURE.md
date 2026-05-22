# E-Commerce Platform - Architecture & System Design

## System Overview

This document describes the enhanced microservices architecture for the e-commerce platform with advanced features.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App (React Native)  │  Desktop App  │  API  │
└────────────┬──────────────────────────┬──────────────────┬───────────┘
             │                          │                  │
             └──────────────────────────┼──────────────────┘
                                        │
                ┌───────────────────────┴────────────────────────┐
                │   API GATEWAY / LOAD BALANCER                  │
                │   (Kong / Nginx / AWS API Gateway)            │
                └───────────┬────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────────────┬────────────────┐
            │               │                       │                │
    ┌───────▼────────┐ ┌────▼──────────┐ ┌─────────▼─────┐  ┌───────▼──────────┐
    │  AUTH SERVICE  │ │ SEARCH SERVICE│ │ PAYMENT       │  │  NOTIFICATION    │
    │  (Node.js)     │ │ (Python/Go)   │ │ SERVICE       │  │  SERVICE         │
    │                │ │ - Elasticsearch
    │ - JWT/OAuth    │ │ - Autocomplete│ │ (Node.js)     │  │ (Node.js + Celery)
    │ - User Mgmt    │ │ - Filters     │ │ - Stripe API  │  │ - Email (SendGrid)
    │ - Sessions     │ │ - Facets      │ │ - PayPal API  │  │ - SMS (Twilio)
    │ - 2FA          │ │ - Analytics   │ │ - Webhooks    │  │ - Push Notif
    │                │ │                │ │ - Refunds     │  │ - In-app Messages
    └────────┬───────┘ └────┬───────────┘ └────────┬──────┘  └─────────┬────────┘
             │               │                      │                   │
    ┌────────▼───────┐ ┌──────▼──────────┐ ┌──────▼──────┐  ┌──────────▼─────────┐
    │ PRODUCT SERVICE│ │ ORDER SERVICE   │ │ REVIEW      │  │ RECOMMENDATION     │
    │ (FastAPI)      │ │ (Express)       │ │ SERVICE     │  │ SERVICE            │
    │                │ │                  │ (Node.js)    │  │ (Python/TensorFlow)
    │ - Products     │ │ - Order CRUD    │ │             │  │ - Collaborative    │
    │ - Categories   │ │ - Order Tracking│ │ - Reviews   │  │ - Content-based    │
    │ - Variants     │ │ - Returns/RMA   │ │ - Ratings   │  │ - Trending         │
    │ - Stock Mgmt   │ │ - Shipments     │ │ - Moderation│  │ - Personalized     │
    │ - Attributes   │ │                  │ │             │  │                    │
    │ - Images       │ │                  │ │             │  │                    │
    └────────┬───────┘ └──────┬───────────┘ └─────────────┘  └────────────────────┘
             │                │
             │        ┌───────▼──────┐
             │        │ WISHLIST/     │
             │        │ COUPON SERVICE│
             │        │ (Node.js)     │
             │        │               │
             │        │ - Wishlists   │
             │        │ - Price Alerts│
             │        │ - Coupons     │
             │        │ - Discounts   │
             │        │ - Loyalty Pts │
             │        └───────────────┘
             │
    ┌────────┴─────────────────────────────────────────┐
    │            DATA LAYER                            │
    ├───────────────────────────────────────────────────┤
    │ ┌─────────────────┐ ┌──────────────────────────┐ │
    │ │ DATABASES       │ │ CACHE & MESSAGE QUEUE   │ │
    │ ├─────────────────┤ ├──────────────────────────┤ │
    │ │ PostgreSQL      │ │ Redis (Cache)            │ │
    │ │ - Users DB      │ │ - Session cache          │ │
    │ │ - Products DB   │ │ - Product cache          │ │ 
    │ │ - Orders DB     │ │ - User preferences       │ │
    │ │ - Catalog DB    │ │                          │ │
    │ │                 │ │ RabbitMQ/Redis           │ │
    │ │ MongoDB         │ │ (Message Queue)          │ │
    │ │ - Analytics     │ │ - Event streaming        │ │
    │ │ - Logs          │ │ - Async tasks            │ │
    │ │ - Sessions      │ │ - Task scheduling        │ │
    │ │                 │ │                          │ │
    │ │ Elasticsearch   │ │ S3-compatible Storage    │ │
    │ │ - Product Index │ │ - Product images         │ │
    │ │ - Search Data   │ │ - User avatars           │ │
    │ │ - Analytics     │ │ - Invoices               │ │
    │ └─────────────────┘ └──────────────────────────┘ │
    └───────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────┐
    │         EXTERNAL SERVICES                         │
    ├───────────────────────────────────────────────────┤
    │ Stripe │ PayPal │ Google │ Facebook │ GitHub      │
    │ SendGrid │ Twilio │ Firebase │ Shippo │ AWS       │
    └───────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────┐
    │          MONITORING & LOGGING                     │
    ├───────────────────────────────────────────────────┤
    │ Prometheus │ Grafana │ ELK Stack │ DataDog       │
    │ New Relic │ Sentry │ CloudWatch                   │
    └───────────────────────────────────────────────────┘
```

---

## Microservices Description

### 1. Frontend Service (React + Vite)
**Port**: 5173  
**Technology**: React, Vite, Redux Toolkit, Material-UI  
**Responsibilities**:
- User interface
- Client-side routing
- State management
- Real-time notifications
- PWA capabilities

**Key Components**:
- Home page with recommendations
- Product search and filtering
- Product detail page with reviews
- Shopping cart
- Checkout flow
- User account
- Order history
- Admin dashboard
- Wishlist management

---

### 2. API Gateway
**Port**: 8080 (or reverse proxy port)  
**Technology**: Kong / Nginx / AWS API Gateway  
**Responsibilities**:
- Request routing
- Rate limiting
- Authentication/Authorization
- Request/response transformation
- Service discovery
- Load balancing
- CORS handling

**Features**:
- Circuit breaker
- Retry logic
- Caching
- Monitoring
- API versioning

---

### 3. Auth Service (NEW)
**Port**: 3001  
**Technology**: Node.js + Express  
**Database**: PostgreSQL (users table)  
**Responsibilities**:
- User registration and login
- JWT token generation and validation
- OAuth2 integration (Google, GitHub, Facebook)
- Password reset
- 2FA management
- Session management

**Endpoints**:
```
POST   /auth/register           - Register new user
POST   /auth/login              - User login
POST   /auth/logout             - User logout
POST   /auth/refresh-token      - Refresh JWT
POST   /auth/forgot-password    - Request password reset
POST   /auth/reset-password     - Reset password
POST   /auth/oauth/:provider    - OAuth login
GET    /auth/me                 - Get current user
GET    /auth/verify-token       - Verify JWT token
POST   /auth/2fa/setup          - Enable 2FA
POST   /auth/2fa/verify         - Verify 2FA code
```

---

### 4. Product Service (Enhanced)
**Port**: 8000  
**Technology**: FastAPI + SQLAlchemy  
**Database**: PostgreSQL (products, categories, reviews)  
**Responsibilities**:
- Product CRUD operations
- Category management
- Product variants
- Product attributes
- Image management
- Stock management
- Product search indexing

**Endpoints**:
```
GET    /products                 - List all products (with filters)
POST   /products                 - Create product (admin)
GET    /products/{id}            - Get product details
PUT    /products/{id}            - Update product
DELETE /products/{id}            - Delete product
GET    /categories               - List categories
POST   /categories               - Create category
GET    /products/{id}/images     - Get product images
POST   /products/{id}/images     - Upload product image
GET    /products/{id}/variants   - Get product variants
POST   /products/{id}/variants   - Create variant
GET    /products/search?q=query  - Search products
```

---

### 5. Order Service (Enhanced)
**Port**: 3000  
**Technology**: Express + PostgreSQL  
**Database**: PostgreSQL (orders, shipments, returns)  
**Responsibilities**:
- Order creation and management
- Order tracking
- Shipment management
- Return/RMA processing
- Order cancellation
- Order status updates

**Endpoints**:
```
GET    /orders                  - List user orders
POST   /orders                  - Create order
GET    /orders/{id}             - Get order details
PUT    /orders/{id}             - Update order
DELETE /orders/{id}             - Cancel order
GET    /orders/{id}/shipments   - Get shipment info
POST   /orders/{id}/returns     - Request return
GET    /orders/{id}/returns     - Get return status
GET    /orders/{id}/track       - Track order
POST   /orders/{id}/cancel      - Cancel order
```

---

### 6. Payment Service (NEW)
**Port**: 3002  
**Technology**: Node.js + Express  
**Database**: PostgreSQL (payments, transactions, refunds)  
**Responsibilities**:
- Payment processing
- Payment gateway integration
- Transaction management
- Refund processing
- Payment webhook handling
- Invoice generation

**Integrations**:
- Stripe API
- PayPal API
- Google Pay
- Apple Pay
- Local payment methods

**Endpoints**:
```
POST   /payments/process        - Process payment
GET    /payments/{id}           - Get payment status
POST   /payments/{id}/refund    - Refund payment
GET    /payments/order/{orderId} - Get order payments
POST   /webhooks/stripe         - Stripe webhook
POST   /webhooks/paypal         - PayPal webhook
```

---

### 7. Review Service (NEW)
**Port**: 3003  
**Technology**: Node.js + Express  
**Database**: PostgreSQL (reviews, ratings)  
**Responsibilities**:
- Review submission
- Review approval/moderation
- Rating aggregation
- Review analytics
- Seller responses

**Endpoints**:
```
GET    /reviews/product/{productId}  - Get product reviews
POST   /reviews                       - Submit review
PUT    /reviews/{id}                  - Update review
DELETE /reviews/{id}                  - Delete review
POST   /reviews/{id}/helpful          - Mark as helpful
POST   /reviews/{id}/response         - Seller response
GET    /reviews/trending              - Get trending reviews
```

---

### 8. Wishlist Service (NEW)
**Port**: 3004  
**Technology**: Node.js + Express  
**Database**: PostgreSQL (wishlists, price alerts)  
**Responsibilities**:
- Wishlist management
- Price tracking
- Price alerts
- Wishlist sharing

**Endpoints**:
```
GET    /wishlists                     - Get user wishlists
POST   /wishlists                     - Create wishlist
PUT    /wishlists/{id}                - Update wishlist
DELETE /wishlists/{id}                - Delete wishlist
GET    /wishlists/{id}/items          - Get wishlist items
POST   /wishlists/{id}/items          - Add item to wishlist
DELETE /wishlists/{id}/items/{itemId} - Remove from wishlist
POST   /wishlists/{id}/share          - Share wishlist
GET    /price-alerts                  - Get price alerts
POST   /price-alerts                  - Create price alert
```

---

### 9. Coupon & Loyalty Service (NEW)
**Port**: 3005  
**Technology**: Node.js + Express  
**Database**: PostgreSQL (coupons, loyalty points)  
**Responsibilities**:
- Coupon management
- Loyalty points tracking
- Discount calculations
- Tier management
- Referral rewards

**Endpoints**:
```
GET    /coupons/validate              - Validate coupon code
GET    /loyalty/points                - Get user loyalty points
POST   /loyalty/points/redeem         - Redeem points
GET    /loyalty/tiers                 - Get tier info
GET    /loyalty/referrals             - Get referral info
POST   /loyalty/referrals/generate    - Generate referral code
GET    /flash-sales                   - Get flash sales
```

---

### 10. Notification Service (NEW)
**Port**: 3006  
**Technology**: Node.js + Celery  
**Database**: PostgreSQL (notifications, queues)  
**Responsibilities**:
- Email notifications
- SMS notifications
- Push notifications
- In-app notifications
- Notification preferences
- Event-driven notifications

**Integrations**:
- SendGrid (Email)
- Twilio (SMS)
- Firebase Cloud Messaging (Push)
- Socket.io (In-app)

**Events**:
```
- order.created
- order.shipped
- order.delivered
- payment.received
- product.back_in_stock
- price.dropped
- review.published
- coupon.available
- seasonal.promotion
```

---

### 11. Recommendation Engine (NEW)
**Port**: 5000  
**Technology**: Python + TensorFlow / Scikit-learn  
**Database**: PostgreSQL + Redis  
**Responsibilities**:
- Collaborative filtering
- Content-based recommendations
- Trending products
- Personalization
- A/B testing support

**Features**:
- Frequently bought together
- Customers also viewed
- Related products
- Personalized homepage
- Smart recommendations

**Endpoints**:
```
GET    /recommendations/user/{userId}     - Get personalized recs
GET    /recommendations/product/{productId}/related - Related products
GET    /recommendations/trending          - Trending products
GET    /recommendations/trending/category - Trending by category
POST   /recommendations/train             - Train model
```

---

### 12. Search Service (NEW)
**Port**: 9200 (Elasticsearch)  
**Technology**: Elasticsearch + Python wrapper  
**Responsibilities**:
- Product indexing
- Full-text search
- Faceted search
- Auto-complete
- Search analytics

**Features**:
- Typo tolerance
- Phonetic search
- Category-aware search
- Price range filtering
- Availability filtering

---

## Data Flow Diagrams

### 1. Order Placement Flow

```
Customer
   │
   ├─→ Browse Products
   │     (Product Service)
   │
   ├─→ Add to Cart
   │     (Frontend State)
   │
   ├─→ Checkout
   │     ├─→ Auth Service (Verify user)
   │     ├─→ Validate Coupon (Coupon Service)
   │     ├─→ Calculate Total (Order Service)
   │     └─→ Get Shipping Cost
   │
   ├─→ Process Payment
   │     ├─→ Payment Service
   │     ├─→ Payment Gateway (Stripe/PayPal)
   │     └─→ Confirmation Webhook
   │
   ├─→ Create Order
   │     ├─→ Order Service
   │     ├─→ Update Product Stock (Product Service)
   │     ├─→ Clear Cart
   │     └─→ Loyalty Points (Coupon Service)
   │
   └─→ Send Notifications
         ├─→ Email Confirmation (Notification Service)
         ├─→ SMS Update (Notification Service)
         └─→ In-app Notification
```

### 2. Product Search Flow

```
User Search
   │
   ├─→ API Gateway
   │
   ├─→ Search Service (Elasticsearch)
   │     ├─→ Query parsing
   │     ├─→ Facet calculation
   │     ├─→ Auto-complete suggestions
   │     └─→ Result ranking
   │
   ├─→ Enrich Results
   │     ├─→ Product Service (Get full product details)
   │     ├─→ Review Service (Get ratings)
   │     └─→ Recommendation Service (Get related items)
   │
   └─→ Return to Frontend
         └─→ Display with filters
```

### 3. Notification Flow

```
Event Triggered
   │
   ├─→ Event Published to Message Queue
   │
   ├─→ Notification Service Consumes Event
   │
   ├─→ Check User Preferences
   │
   ├─→ Format Message
   │     ├─→ Email (SendGrid)
   │     ├─→ SMS (Twilio)
   │     ├─→ Push (Firebase)
   │     └─→ In-app (Socket.io)
   │
   └─→ Send Notifications
```

---

## Technology Stack

### Frontend
- React 18+
- Vite
- Redux Toolkit
- Material-UI or Chakra UI
- Axios
- React Router v6
- Socket.io-client
- Three.js (for AR)

### Backend Services
- Node.js 18+ (Auth, Order, Payment, Review, Wishlist, Coupon, Notification)
- FastAPI (Product Service)
- Python (Recommendation Engine)
- Express.js
- PostgreSQL 14+
- MongoDB (Analytics, Logs)
- Elasticsearch 8+
- Redis

### Infrastructure
- Docker & Docker Compose
- Kubernetes (optional, for production)
- Kong API Gateway
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)

### External Services
- Stripe (Payments)
- PayPal (Payments)
- SendGrid (Email)
- Twilio (SMS)
- Firebase (Push Notifications)
- AWS S3 (File Storage)
- Google OAuth
- GitHub OAuth
- Facebook OAuth

### Monitoring & Logging
- Prometheus (Metrics)
- Grafana (Dashboards)
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Sentry (Error Tracking)
- DataDog / New Relic (APM)

---

## Deployment Architecture

### Development
- Docker Compose with all services
- Hot reload enabled
- Mock external services

### Staging
- Kubernetes cluster with 2 replicas per service
- Real external service integrations
- Load balancing

### Production
- Kubernetes cluster with auto-scaling
- Multi-region deployment
- High availability setup
- CDN for static assets
- Database replication
- Backup and disaster recovery

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│          SECURITY LAYERS                     │
├─────────────────────────────────────────────┤
│ 1. HTTPS/TLS - All communications          │
│ 2. API Gateway - Rate limiting, DDoS      │
│ 3. Authentication - JWT, OAuth2            │
│ 4. Authorization - Role-based (RBAC)       │
│ 5. Data Encryption - At rest & in transit  │
│ 6. Input Validation - All endpoints        │
│ 7. SQL Injection Prevention - Parameterized│
│ 8. XSS Protection - Sanitization           │
│ 9. CSRF Protection - Tokens                │
│10. Security Headers - CSP, X-Frame-Options│
│11. PCI-DSS - Payment security compliance   │
│12. Regular Audits & Penetration Testing    │
└─────────────────────────────────────────────┘
```

---

## Performance Optimization

- **Caching**: Redis for session, product, user data
- **CDN**: CloudFlare for static assets
- **Database**: Indexing, query optimization, replication
- **API**: Pagination, field projection, compression
- **Frontend**: Code splitting, lazy loading, image optimization
- **Search**: Elasticsearch for fast, relevant results

---

## Scalability Considerations

- **Horizontal Scaling**: Stateless services with load balancing
- **Database Sharding**: By user ID or order ID for Orders
- **Elasticsearch Sharding**: Multiple nodes for search
- **Message Queue**: For async processing and decoupling
- **Cache Layer**: Redis for reducing database load
- **Microservices**: Independent scaling per service

