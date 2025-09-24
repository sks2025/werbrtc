# 🔧 Quick Fix for Recording Error

आपके VPS पर recording error इसलिए आ रहा है क्योंकि database में `mediaData` column नहीं है। यह तब होता है जब database schema पुराना हो।

## 🚀 Quick Fix (2 minutes)

### VPS पर login करके backend folder में जाएं:

```bash
cd /path/to/your/werbrtc/backend
```

### Option 1: NPM Script (आसान तरीका)
```bash
npm run reset-db
```

### Option 2: Fix Script (अगर NPM script काम न करे)
```bash
chmod +x fix-vps-database.sh
./fix-vps-database.sh
```

### Option 3: Manual SQL (Direct database में)
```bash
psql -U your_username -d your_database -f reset-and-setup-database.sql
```

## ✅ इसके बाद:

1. **Application restart करें:**
   ```bash
   pm2 restart webrtc-consultation
   # या
   npm start
   ```

2. **Test करें:**
   - Browser में application खोलें
   - Doctor login करें: `john.smith@hospital.com` / `password123`
   - Recording start करके देखें

3. **Logs check करें:**
   ```bash
   pm2 logs webrtc-consultation
   ```

## ❓ अगर फिर भी error आए:

```bash
# Database connection test करें:
npm run test-db

# Tables check करें:
psql -U username -d database -c "\dt"

# Columns check करें:
psql -U username -d database -c "\d room_media"
```

## 🔍 Error का कारण:

आपका database में **old schema** था जिसमें `room_media` table में `mediaData` column नहीं था। 

**New schema** में यह column है:
- `mediaData` - Recording data store करने के लिए
- `fileName` - File name store करने के लिए  
- `metadata` - Additional data के लिए

## 🎯 Reset के बाद मिलेगा:

✅ Fresh database with correct schema  
✅ All foreign key relations  
✅ Sample admin and doctor data  
✅ Working recording functionality  

**Login credentials:**
- Admin: `admin@gmail.com` / `Admin@123`
- Doctor: `john.smith@hospital.com` / `password123`

---

**अब आपका recording काम करेगा! 🚀**
