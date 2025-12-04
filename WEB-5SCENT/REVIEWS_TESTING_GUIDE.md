# Reviews Management - Quick Testing Guide

## 🚀 Quick Start

### Access the Reviews Page
1. Navigate to: `http://localhost:3000/admin/reviews`
2. Should see:
   - Page title: "Reviews Management"
   - Subtitle: "Monitor customer feedback"
   - Date selector button (top right)
   - Reviews table (if reviews exist in database)

## 📋 Test Cases

### Test 1: Page Loads
✅ **Expected**: Reviews page loads without errors
- Check browser console (F12) for errors
- Page should display loading state briefly, then show reviews or empty message

### Test 2: View Reviews Table
✅ **Expected**: Reviews display in table with all columns
- Column headers: Customer, Product, Rating, Comment, Date, Actions
- Data should populate from database
- Stars should display as filled/unfilled icons
- Comments should be truncated if >60 characters
- Dates should be in YYYY-MM-DD format

### Test 3: View Review Details
✅ **Expected**: Click "View" button opens modal
- Modal appears with overlay
- Modal title: "Review Details"
- Displays:
  - Customer name
  - Date (YYYY-MM-DD)
  - Product name
  - Rating (stars + fraction like "5/5")
  - Comment (full text, not truncated)
- X button closes modal
- Clicking outside modal closes it

### Test 4: Toggle Visibility
✅ **Expected**: Eye icon toggles visibility
1. Click eye icon on a review
2. Icon should change (eye → eye-slash or vice versa)
3. Toast notification appears: "Review shown/hidden successfully"
4. Refresh page or check database - review visibility changes
5. If hidden, review may disappear from table (depends on filtering)

### Test 5: Delete Review
✅ **Expected**: Trash icon shows confirmation modal
1. Click trash icon on a review
2. Confirmation modal appears with message
3. Click "Cancel" - modal closes, review stays
4. Click trash icon again
5. Click "Delete" - review removed from table
6. Toast notification: "Review deleted successfully"
7. Refresh page - review is gone from database

### Test 6: API Endpoints
✅ **Expected**: API endpoints respond correctly

#### Get All Reviews
```bash
curl -X GET http://localhost:8000/api/admin/reviews \
  -H "Authorization: Bearer {your_admin_token}"
```

Response should include array of reviews with:
- rating_id, user_id, product_id, order_id
- stars (1-5)
- comment (text)
- created_at, updated_at
- is_visible (boolean)
- user object (with name, email, user_id)
- product object (with name, product_id)

#### Get Single Review
```bash
curl -X GET http://localhost:8000/api/admin/reviews/1 \
  -H "Authorization: Bearer {your_admin_token}"
```

#### Toggle Visibility
```bash
curl -X PUT http://localhost:8000/api/admin/reviews/1/visibility \
  -H "Authorization: Bearer {your_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"is_visible": false}'
```

#### Delete Review
```bash
curl -X DELETE http://localhost:8000/api/admin/reviews/1 \
  -H "Authorization: Bearer {your_admin_token}"
```

## 🐛 Troubleshooting

### Issue: Page shows "Loading reviews..." forever
**Solution**: 
- Check browser console for error messages
- Verify admin token is saved in localStorage
- Check Laravel logs: `storage/logs/laravel.log`
- Ensure backend server is running on port 8000

### Issue: "Failed to load reviews" error appears
**Solution**:
- Confirm admin is logged in
- Check if admin_token exists in localStorage
- Verify database has reviews in `rating` table
- Check that relationships (user, product) are set up correctly

### Issue: Reviews table is empty
**Solution**:
- Check if there are any reviews in the database:
  ```sql
  SELECT * FROM rating;
  ```
- If no reviews exist, create test data:
  ```sql
  INSERT INTO rating (user_id, product_id, order_id, stars, comment, is_visible, created_at, updated_at)
  VALUES (1, 1, 1, 5, 'Great product!', true, NOW(), NOW());
  ```

### Issue: Star icons don't display
**Solution**:
- Check if react-icons package is installed
- Verify FaStar import: `from 'react-icons/fa6'`
- Check browser console for import errors

### Issue: Date selector button doesn't work
**Solution**:
- Date button is currently non-functional (no date picker implemented)
- It displays the current date
- This is acceptable for current implementation
- Can add date picker library later if needed

### Issue: Modal doesn't close
**Solution**:
- Clicking X button should close modal
- Clicking outside modal should close it
- Check browser console for JavaScript errors
- Verify click handlers are working

## 📊 Database Query Reference

### View all reviews with relationships
```sql
SELECT 
  r.rating_id,
  r.stars,
  r.comment,
  r.is_visible,
  r.created_at,
  u.name as customer_name,
  p.name as product_name
FROM rating r
LEFT JOIN user u ON r.user_id = u.user_id
LEFT JOIN product p ON r.product_id = p.product_id
ORDER BY r.created_at DESC;
```

### Check is_visible column
```sql
DESCRIBE rating;
```

Should show `is_visible` column with type TINYINT(1) and default 1

## ✅ Verification Checklist

Before considering implementation complete:

- [ ] Reviews page loads at `/admin/reviews`
- [ ] Reviews table displays with correct columns
- [ ] Customer names populate from users table
- [ ] Product names populate from products table
- [ ] Star ratings display as icons (1-5)
- [ ] Comments truncate at 60 characters
- [ ] View button opens details modal
- [ ] Modal displays all review information correctly
- [ ] Modal closes on X button click
- [ ] Modal closes on outside click
- [ ] Eye icon toggles visibility
- [ ] Visibility change persists in database
- [ ] Trash icon opens delete confirmation
- [ ] Cancel deletes nothing
- [ ] Delete removes review from table and database
- [ ] Toast notifications appear for all actions
- [ ] No console errors
- [ ] No 404 errors in network tab
- [ ] API endpoints respond with correct data
- [ ] Authentication works (admin token required)

## 📈 Performance Notes

- Page loads reviews on mount (useEffect)
- Updates to visibility and delete are optimistic (UI updates immediately)
- Network requests are handled asynchronously
- Error states handled with toast notifications
- No unnecessary re-renders with proper hook dependencies

## 🎨 Styling Notes

- Uses Tailwind CSS utility classes
- Dark text on light background for readability
- Yellow stars for ratings (text-yellow-400, fill-yellow-400)
- Red delete button (bg-red-600, hover:bg-red-700)
- Blue view button (text-blue-600)
- Gray icons for visibility toggle
- Semi-transparent overlay for modals (bg-black bg-opacity-50)
- Responsive design with mobile support

## 🔐 Security Notes

- All endpoints require admin authentication
- Admin token from localStorage passed automatically
- Backend validates all mutations
- Delete requires confirmation before execution
- Error messages don't leak sensitive information

## 📝 Future Enhancements

Potential features to add:
- Date range filtering
- Sort by rating, date, customer
- Search by customer/product
- Batch operations (delete multiple)
- Export reviews to CSV
- Filter by visibility status
- Reply to reviews
- Pin helpful reviews
