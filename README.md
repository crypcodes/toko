# E-Commerce Management Dashboard

A comprehensive fullstack web application for managing Shopee and TikTokShop businesses from a unified dashboard.

## Live Demo

**Production URL**: https://g0991q8xvnp1.space.minimax.io

**Demo Credentials**:
- Email: testuser@gmail.com
- Password: test123

## Features

### Core Functionality
- **Unified Dashboard**: Monitor products, orders, and inventory from both Shopee and TikTokShop platforms
- **Product Management**: View, search, filter, and manage product catalog
- **Order Processing**: Track orders, update fulfillment status, manage shipping
- **Inventory Control**: Real-time stock tracking with low-stock alerts
- **Analytics**: Revenue tracking, platform comparison, business metrics
- **Automated Sync**: Synchronize data from platforms automatically
- **Real-time Notifications**: Get alerts for new orders and low stock

### Technical Features
- **User Authentication**: Secure login/signup with Supabase Auth
- **Modern UI**: Clean, minimalist design optimized for usability
- **Responsive**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live data synchronization
- **Secure**: Row-level security, encrypted credentials

## Architecture

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Build Tool**: Vite
- **UI Components**: Lucide React Icons
- **State Management**: React Context API

### Backend
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **API**: Supabase Edge Functions (Deno)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions

## Database Schema

### Tables
1. **profiles** - User profiles with company information
2. **platform_credentials** - Encrypted API credentials for Shopee/TikTokShop
3. **products** - Unified product catalog across platforms
4. **orders** - Centralized order management
5. **inventory_levels** - Stock tracking per platform/location
6. **sync_logs** - Synchronization history and status
7. **notifications** - User alerts and notifications
8. **user_settings** - User preferences and configuration

## Edge Functions

### 1. sync-platforms
Synchronizes products and orders from Shopee and TikTokShop platforms.

**Endpoint**: `/functions/v1/sync-platforms`

**Request**:
```json
{
  "syncType": "full|products|orders",
  "platform": "all|shopee|tiktokshop"
}
```

**Response**:
```json
{
  "data": {
    "syncLogId": "uuid",
    "itemsProcessed": 10,
    "itemsSucceeded": 10,
    "itemsFailed": 0,
    "durationSeconds": 5
  }
}
```

### 2. update-inventory
Updates product inventory and syncs across platforms.

**Endpoint**: `/functions/v1/update-inventory`

**Request**:
```json
{
  "productId": "uuid",
  "updates": {
    "stock_quantity": 50
  }
}
```

**Response**:
```json
{
  "data": {
    "success": true,
    "productId": "uuid",
    "syncResults": {
      "shopee": { "success": true, "synced": true },
      "tiktokshop": { "success": true, "synced": false }
    }
  }
}
```

### 3. process-order
Processes order fulfillment and status updates.

**Endpoint**: `/functions/v1/process-order`

**Request**:
```json
{
  "orderId": "uuid",
  "action": "confirm|ship|deliver|cancel",
  "trackingNumber": "optional",
  "carrier": "optional"
}
```

**Response**:
```json
{
  "data": {
    "success": true,
    "orderId": "uuid",
    "action": "ship",
    "newStatus": "shipped",
    "platformSync": {
      "platform": "shopee",
      "success": true,
      "synced": true
    }
  }
}
```

## API Integration Architecture

### Current Implementation
The application is built with a **hybrid integration architecture** that supports both:

1. **Mock Data Layer** (Current): Demonstrates full functionality with simulated data
2. **Real API Integration** (Production-ready): Structure ready for official Shopee/TikTokShop APIs

### Integration Strategy

#### For Production Deployment
To integrate with real Shopee and TikTokShop platforms:

1. **Register as Platform Partner**:
   - Shopee: https://open.shopee.com/
   - TikTokShop: https://partner.tiktokshop.com/

2. **Complete Business Verification**:
   - Submit business documentation
   - Obtain Partner ID and Partner Key
   - Configure OAuth 2.0 credentials

3. **Update Edge Functions**:
   Replace mock data functions with real API calls:
   ```typescript
   // Current: Mock data generation
   const products = generateMockProducts(userId, platform);
   
   // Production: Real API call
   const products = await fetchShopeeProducts(accessToken, shopId);
   const products = await fetchTikTokProducts(accessToken, shopId);
   ```

4. **Store Credentials**:
   Add platform credentials to `platform_credentials` table:
   ```sql
   INSERT INTO platform_credentials (
     user_id, platform, shop_id, access_token, refresh_token
   ) VALUES (?, 'shopee', ?, ?, ?);
   ```

### API Integration Details

#### Shopee Integration
- **Authentication**: OAuth 2.0 + HMAC-SHA256 signatures
- **Endpoints**: Products, Orders, Logistics, Payments
- **Documentation**: See `docs/shopee_api_analysis.md`

#### TikTokShop Integration
- **Authentication**: OAuth 2.0 + HMAC-SHA256 signatures
- **Endpoints**: Products, Orders, Fulfillment, Analytics
- **Documentation**: See `docs/tiktokshop_api_analysis.md`

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- Supabase account

### Installation

1. **Clone and install dependencies**:
```bash
cd ecommerce-dashboard
pnpm install
```

2. **Configure environment** (already configured):
   - Supabase URL: `https://ncynycpsbcctkaxiaktq.supabase.co`
   - Anon Key: Hardcoded in `src/lib/supabase.ts`

3. **Run development server**:
```bash
pnpm run dev
```

4. **Build for production**:
```bash
pnpm run build
```

## Project Structure

```
ecommerce-dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── DashboardLayout.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/               # Utilities and configurations
│   │   └── supabase.ts
│   ├── pages/             # Application pages
│   │   ├── LoginPage.tsx
│   │   ├── DashboardOverview.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── SettingsPage.tsx
│   └── App.tsx            # Main application component
├── supabase/
│   └── functions/         # Edge functions
│       ├── sync-platforms/
│       ├── update-inventory/
│       └── process-order/
└── docs/                  # Documentation and research
    ├── shopee_api_analysis.md
    ├── tiktokshop_api_analysis.md
    └── alternative_integration_methods.md
```

## Design System

### Color Palette
- **Primary**: Gray-900 (Main actions, sidebar active states)
- **Shopee Accent**: Orange-500 (#FF6E31)
- **TikTok Accent**: Black (#000000)
- **Success**: Green-500
- **Warning**: Orange-500
- **Error**: Red-500

### Typography
- **Headings**: Bold, Gray-900
- **Body**: Regular, Gray-700
- **Secondary**: Regular, Gray-600

### Components
- **Cards**: White background, gray border, rounded corners
- **Buttons**: Primary (gray-900), Secondary (gray-100)
- **Inputs**: Border with focus ring
- **Tables**: Clean rows with hover states

## Security

### Authentication
- **Supabase Auth**: Email/password authentication
- **Session Management**: Automatic token refresh
- **Protected Routes**: Private route wrapper

### Database Security
- **Row Level Security (RLS)**: Enabled on all tables
- **User Isolation**: Users can only access their own data
- **Secure Credentials**: API keys encrypted at rest

### API Security
- **CORS Headers**: Configured for security
- **Token Verification**: All edge functions verify user tokens
- **Service Role Access**: Controlled permissions

## Scalability

### Performance Optimizations
- **Code Splitting**: Lazy loading with React Router
- **Image Optimization**: Responsive images, proper sizing
- **Database Indexing**: Optimized queries with indexes
- **Caching**: Efficient data fetching

### Future Enhancements
1. **Webhook Integration**: Real-time platform updates
2. **Batch Operations**: Bulk product/order updates
3. **Advanced Analytics**: Charts and trend analysis
4. **Export Functionality**: CSV/Excel data exports
5. **Multi-user Support**: Team collaboration features
6. **Mobile App**: React Native version

## Deployment

The application is deployed on MiniMax Space infrastructure.

**Production Build**:
```bash
pnpm run build
```

**Deploy**:
Built files in `dist/` directory are automatically deployed.

## Support

For issues or questions:
- Review API documentation in `docs/` folder
- Check Supabase logs for backend errors
- Test edge functions using built-in testing tools

## License

Private project for demonstration purposes.