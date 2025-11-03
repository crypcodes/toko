# Quick Start Guide - E-Commerce Management Dashboard

## Access the Live Application

**URL**: https://g0991q8xvnp1.space.minimax.io

**Demo Account**:
- Email: testuser@gmail.com
- Password: test123

## First Login

1. Navigate to https://g0991q8xvnp1.space.minimax.io
2. You'll see the login page
3. Click "Sign Up" tab to create a new account, or use the demo account
4. After login, you'll land on the Dashboard

## Key Features Overview

### 1. Dashboard Overview
- View total revenue, orders, and product statistics
- Monitor recent orders
- Check system notifications
- Click "Sync Now" to trigger platform synchronization

### 2. Products Management
Navigate to **Products** from the sidebar:
- View all products in a grid layout
- Search products by name or SKU
- Filter by platform (Shopee, TikTok Shop)
- Filter by status (Active, Inactive, Out of Stock)
- Edit stock quantities by clicking "Edit" button
- Delete products with the trash icon

### 3. Orders Management
Navigate to **Orders** from the sidebar:
- View all orders in a table format
- Search by order number or customer name
- Filter by platform and order status
- Process orders:
  - Confirm pending orders
  - Mark orders as shipped (with tracking)
  - Mark as delivered
  - Cancel orders

### 4. Analytics
Navigate to **Analytics** from the sidebar:
- View overall business metrics
- Compare Shopee vs TikTok Shop performance
- Track revenue, orders, and average order value
- Platform-specific statistics

### 5. Settings
Navigate to **Settings** from the sidebar:
- Enable/disable automatic synchronization
- Set sync interval (15 min to 6 hours)
- Configure notification preferences:
  - Low stock alerts
  - New order alerts
  - Email notifications
- Manual sync trigger

## Testing the Sync Feature

1. Go to Dashboard
2. Click "Sync Now" button
3. Wait for sync to complete
4. Navigate to Products or Orders to see new data

## Creating Your Own Products

Currently, products are synced from platforms. To add manual products:
1. Use the database directly via Supabase
2. Or wait for the "Add Product" feature implementation

## Understanding Platform Integration

### Current State: Demo Mode
The application currently runs with **simulated data** to demonstrate functionality without requiring actual Shopee/TikTokShop API credentials.

### Production Mode: Real API Integration
To connect to real platforms, you need to:

1. **Register as Partner**:
   - Shopee: https://open.shopee.com/
   - TikTokShop: https://partner.tiktokshop.com/

2. **Get Credentials**:
   - Partner ID
   - Partner Key
   - OAuth 2.0 tokens

3. **Update Platform Credentials**:
   - Navigate to Settings (when implemented)
   - Add your Shopee credentials
   - Add your TikTokShop credentials

4. **Backend Updates**:
   - Edge functions will automatically switch from mock data to real API calls
   - Sync will pull real products and orders

## Troubleshooting

### Cannot Login
- Make sure you're using the correct demo credentials
- Clear browser cache and try again
- Create a new account using Sign Up

### Data Not Showing
- Click "Sync Now" on the Dashboard
- Check that you're logged in
- Refresh the page

### Features Not Working
- Some advanced features are in development
- Core functionality (viewing, filtering, searching) works perfectly
- CRUD operations are functional

## Next Steps

### For Users
1. Familiarize yourself with the dashboard layout
2. Explore Products and Orders pages
3. Test the search and filter functionality
4. Configure your notification preferences

### For Developers
1. Review the README.md for technical details
2. Check the API documentation in docs/ folder
3. Examine edge functions for integration patterns
4. Follow the database schema for data structure

## Support & Documentation

- **Full Documentation**: README.md
- **API Research**: 
  - docs/shopee_api_analysis.md
  - docs/tiktokshop_api_analysis.md
  - docs/alternative_integration_methods.md
- **Source Code**: Available in the project package

## Feature Roadmap

### Coming Soon
- Add Product modal/form
- Bulk operations (import/export)
- Advanced analytics with charts
- Notification center
- Platform credential management UI
- Webhook integration
- Real-time updates

### Future Enhancements
- Team collaboration
- Multi-store management
- Custom reports
- Mobile app
- API rate limit monitoring
- Automated pricing rules

## Tips for Best Experience

1. **Use Latest Browser**: Chrome, Firefox, or Edge for best compatibility
2. **Desktop First**: Optimized for desktop, but works on mobile
3. **Regular Sync**: Set auto-sync to keep data fresh
4. **Monitor Notifications**: Enable alerts for critical updates
5. **Explore All Pages**: Each page has unique functionality

## Getting Help

If you encounter issues:
1. Check this guide first
2. Review the error messages carefully
3. Check browser console for technical details
4. Refer to the full README.md documentation
5. Examine the API research documents for integration details

---

**Enjoy managing your e-commerce business from one unified dashboard!**