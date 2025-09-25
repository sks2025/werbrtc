# 🚨 URGENT FIX - Database Schema Issues

आपके database में multiple schema issues हैं जो recording और admin login को break कर रहे हैं।

## 🔥 **Immediate Fix (Run This Now)**

### **Option 1: Complete SQL Fix (Recommended)**
```bash
# Local development में:
psql -U postgres -d your_database -f complete-database-fix.sql

# VPS पर:
psql -U your_username -d your_database -f complete-database-fix.sql
```

### **Option 2: NPM Script Fix**
```bash
npm run reset-db
```

### **Option 3: Manual Fix Commands**
```bash
# Stop your application first
pm2 stop webrtc-consultation
# or kill the node process

# Then run database fix
node setup-database.js --force --seed
```

## ❌ **Current Issues Found:**

1. **`"mediaData"` column missing** in `room_media` table
2. **Admin table column case mismatch** - expects `"isactive"` but model uses `"isActive"`
3. **Foreign key violations** - `locations` table references wrong room table structure
4. **Mixed table schemas** - some tables use different naming conventions

## ✅ **What the Fix Will Do:**

- ✅ Drop ALL existing tables (saves your code, deletes data)
- ✅ Create fresh tables with correct schema
- ✅ Fix `room_media` table with `mediaData` column
- ✅ Fix admin table with correct `isActive` column
- ✅ Create proper foreign key relationships
- ✅ Add sample data with correct relationships
- ✅ Match all table names to your Sequelize models

## 🔄 **After Running Fix:**

1. **Restart Application:**
   ```bash
   # If using PM2:
   pm2 restart webrtc-consultation
   
   # If using npm:
   npm start
   ```

2. **Test Login:**
   - Admin: `admin@gmail.com` / `Admin@123`
   - Doctor: `santoshkumarsharmabagdatt@gmail.com` / `password123`

3. **Test Recording:**
   - Join room `9999`
   - Try screen recording
   - Should work without errors

## 🔍 **Verify Fix Worked:**

```bash
# Check if mediaData column exists:
psql -U username -d database -c "\d room_media"

# Check sample data:
psql -U username -d database -c "SELECT COUNT(*) FROM doctors;"

# Test application:
curl http://localhost:3000
```

## ⚠️ **Important Notes:**

- **यह सभी existing data को delete कर देगा**
- **Tables को fresh recreate करेगा**
- **Sample data के साथ setup करेगा**
- **Recording functionality fix हो जाएगी**

## 🔧 **If Still Having Issues:**

1. Check logs: `pm2 logs webrtc-consultation`
2. Verify tables: `psql -c "\dt"`
3. Check column: `psql -c "\d room_media"`
4. Restart DB: `sudo systemctl restart postgresql`

---

**🚀 Run the fix now and your recording will work!**
