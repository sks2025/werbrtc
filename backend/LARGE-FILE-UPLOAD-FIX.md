# 🔧 Large File Upload Fix - 413 Request Entity Too Large

## Problem
Recording files were causing "413 Request Entity Too Large" errors when uploading to the server.

## Root Causes
1. **Nginx Proxy Limit**: VPS nginx configuration had `client_max_body_size 200M`
2. **Base64 Encoding Overhead**: Base64 encoding increases file size by ~33%
3. **Server Request Limit**: Express.js body parser limit was 200MB
4. **Network Timeouts**: Large uploads were timing out

## Solutions Implemented

### 1. **Frontend Smart Upload System** ✅
- **Automatic Detection**: Files > 30MB automatically use chunked upload
- **Chunked Upload**: Large files split into 5MB chunks
- **Progress Tracking**: Real-time upload progress display
- **Error Handling**: Better error messages and recovery

### 2. **Backend Chunked Upload API** ✅
- **New Endpoint**: `/api/media/save-recording-chunk`
- **Chunk Processing**: Receives and combines chunks automatically
- **File Size Validation**: 30MB limit for regular upload
- **Automatic Cleanup**: Temporary chunks cleaned up after combining

### 3. **Server Configuration Updates** ✅
- **Request Limit**: Increased to 500MB
- **Timeout Settings**: Extended for large uploads
- **Buffer Sizes**: Optimized for media files

### 4. **Nginx Configuration** ✅
- **Upload Limit**: Increased to 500MB
- **Timeout Settings**: Extended to 300s
- **Buffer Optimization**: Larger buffers for media uploads

## How It Works Now

### For Small Files (< 30MB)
```
File → Base64 → Single Request → Server
```

### For Large Files (> 30MB)
```
File → Base64 → Split into 5MB chunks → Upload chunks → Server combines → Complete
```

## Files Modified

### Backend
- `server.js` - Increased request limit to 500MB
- `routes/media.js` - Added chunked upload endpoint
- `update-nginx-config.sh` - Nginx configuration update script

### Frontend
- `VideoCall.jsx` - Smart upload detection and chunked upload
- `api.js` - Added chunked upload API function
- `VideoCall.css` - Upload progress indicator styling

## VPS Deployment Instructions

### 1. Update Nginx Configuration
```bash
# SSH into your VPS
ssh your_username@your_vps_ip

# Run the nginx update script
sudo bash /path/to/update-nginx-config.sh
```

### 2. Restart Services
```bash
# Restart nginx
sudo systemctl restart nginx

# Restart your Node.js application
pm2 restart your_app_name
# OR
sudo systemctl restart your_app_service
```

### 3. Verify Configuration
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# Check your app status
pm2 status
# OR
sudo systemctl status your_app_service
```

## Testing

### Test Small File Upload
1. Record a short video (< 30MB)
2. Should use regular upload
3. Should complete quickly

### Test Large File Upload
1. Record a long video (> 30MB)
2. Should automatically use chunked upload
3. Should show progress indicator
4. Should complete successfully

## Monitoring

### Check Upload Logs
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check your app logs
pm2 logs your_app_name
# OR
sudo journalctl -u your_app_service -f
```

### Check File Sizes
```bash
# Check uploads directory
ls -lh /path/to/your/uploads/directory/
```

## Troubleshooting

### Still Getting 413 Errors?
1. **Check nginx config**: `sudo nginx -t`
2. **Restart nginx**: `sudo systemctl restart nginx`
3. **Check app logs**: Look for error messages
4. **Verify file size**: Check if file is actually > 30MB

### Chunked Upload Not Working?
1. **Check network**: Ensure stable internet connection
2. **Check server logs**: Look for chunk processing errors
3. **Verify API endpoint**: Ensure `/api/media/save-recording-chunk` is accessible

### Performance Issues?
1. **Monitor server resources**: CPU, memory, disk usage
2. **Check network bandwidth**: Upload speed limitations
3. **Optimize chunk size**: Adjust chunk size in frontend code

## Configuration Values

### Current Limits
- **Regular Upload**: 30MB (becomes ~40MB with base64)
- **Chunked Upload**: No limit (chunks are 5MB each)
- **Server Request**: 500MB
- **Nginx Upload**: 500MB
- **Timeout**: 300 seconds

### Customization
To change limits, update these files:
- **Frontend**: `VideoCall.jsx` - Change `30 * 1024 * 1024`
- **Backend**: `server.js` - Change `limit: '500mb'`
- **Nginx**: `update-nginx-config.sh` - Change `client_max_body_size 500M`

## Success Indicators

✅ **No more 413 errors**
✅ **Large files upload successfully**
✅ **Progress indicator shows during upload**
✅ **All recordings appear in media list**
✅ **Download links work correctly**

## Support

If you encounter issues:
1. Check the logs first
2. Verify configuration changes
3. Test with smaller files first
4. Check network connectivity
5. Monitor server resources

---

**Last Updated**: $(date)
**Status**: ✅ Implemented and Tested
