# Production Deployment Guide

## Overview
This guide covers deploying the EasyRoad API to production on Render.com.

## Prerequisites
- Models uploaded to the `models/` directory:
  - `cracks.pt` (YOLOv8 crack detector)
  - `signs_classificator.pth` (PyTorch sign classifier)
  - `yolov8_signs.pt` (optional, for custom sign detection)

## Environment Configuration

### Render.com Setup

1. **Create Environment Variables** in Render dashboard:
   ```
   ENVIRONMENT=production
   DEBUG=false
   CORS_ORIGINS=https://neurocraft-frontend.onrender.com
   MAX_FILE_SIZE=52428800
   REQUEST_TIMEOUT=300
   HOST=0.0.0.0
   PORT=8000
   WORKERS=4
   ```

2. **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start Command**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0 -t 300 --access-logfile - --error-logfile - app:app
   ```
   Or use the Procfile (automatically detected by Render).

## Deployment Steps

### Via Render Dashboard
1. Go to https://render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: Leave empty (Procfile will be used)
   - **Environment**: Production
5. Add environment variables (see above)
6. Deploy

### Via Docker (Alternative)
```bash
# Build image
docker build -t neurocraft-api .

# Run container
docker run -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e CORS_ORIGINS=https://neurocraft-frontend.onrender.com \
  -v $(pwd)/models:/app/models \
  neurocraft-api
```

## Performance Optimization

### Current Configuration
- **Workers**: 4 (adjust based on CPU cores)
- **Timeout**: 300 seconds (5 minutes for large image processing)
- **Compression**: GZIP enabled for responses
- **Max File Size**: 50MB

### Tuning for Your Service Tier

**Render Starter Plan** (1 CPU, 512MB RAM):
```bash
gunicorn -w 2 -b 0.0.0.0 -t 300 app:app
```

**Render Standard Plan** (2 CPU, 2GB RAM):
```bash
gunicorn -w 4 -b 0.0.0.0 -t 300 app:app
```

**Render Pro Plan** (4+ CPU, 4GB+ RAM):
```bash
gunicorn -w 8 -b 0.0.0.0 -t 300 app:app
```

## Model Management

### Upload Models to Production
1. Place model files in the `models/` directory
2. Ensure files are included in git or use Render's native storage
3. Models are loaded automatically on service startup

### Model Files Required
- `models/cracks.pt` - YOLOv8 crack detection model
- `models/signs_classificator.pth` - PyTorch sign classifier
- `models/yolov8_signs.pt` (optional) - Custom traffic sign detector

## Monitoring & Debugging

### Health Check
The service includes a built-in health check endpoint:
```bash
curl https://neurocraft-backend.onrender.com/health
```

Response:
```json
{
  "status": "healthy",
  "models_loaded": {
    "cracks_detector": true,
    "sign_detector": true,
    "signs_classifier": true
  }
}
```

### Logs
Access logs via Render Dashboard:
1. Go to your service
2. Click "Logs" tab
3. View real-time logs and errors

### Debug Mode (Development Only)
To enable debug mode for troubleshooting:
```
DEBUG=true
ENVIRONMENT=development
```
This enables:
- Verbose logging
- Debug image saves to `debug_crops/` directory
- Detailed error messages in responses

## API Endpoints

### Health Check
```
GET /health
```

### Detect Cracks
```
POST /detect/cracks
Content-Type: multipart/form-data

file: <image_file>
```

### Classify Traffic Signs
```
POST /classify/signs
Content-Type: multipart/form-data

file: <image_file>
```

### Process All Models
```
POST /process/all
Content-Type: multipart/form-data

file: <image_file>
```

## Security Considerations

✅ **Implemented**
- CORS configured to specific origins
- File size limits (50MB default)
- Request timeout protection (5 minutes)
- Input validation (image format check)
- Generic error messages in production
- No debug information leaked in production

⚠️ **Additional Recommendations**
- Add authentication (API keys, OAuth) for production use
- Implement rate limiting
- Add request logging for audit trails
- Set up monitoring alerts
- Use HTTPS (automatic with Render)
- Regular model updates and security scanning

## Troubleshooting

### Models Not Loading
1. Check Render logs for model loading errors
2. Verify model files exist in `models/` directory
3. Check disk space (PyTorch models can be large)
4. Enable DEBUG mode to see detailed startup logs

### High Memory Usage
- Reduce worker count
- Lower MAX_FILE_SIZE if needed
- Implement image pre-processing on frontend

### Slow Responses
- Check GPU availability on plan
- Consider model optimization
- Implement caching on frontend
- Monitor inference time in logs

### CORS Errors
- Verify CORS_ORIGINS environment variable
- Update for all frontend domains
- Include protocol (https://)

## Performance Benchmarks

Typical response times (varies by model size):
- Crack Detection: 5-15 seconds
- Sign Classification: 8-20 seconds
- Process All: 15-30 seconds

Times include image upload, processing, and response generation.

## Next Steps

1. Upload model files to production
2. Configure environment variables
3. Deploy via Render
4. Test health endpoint: `/health`
5. Test endpoints with sample images
6. Monitor logs and adjust worker count if needed
7. Set up monitoring and alerting

## Support

For issues, check:
- Render logs
- `/health` endpoint status
- Environment variables configuration
- Model file availability
