# Weather Radar Display

A full-stack weather radar application that displays real-time MRMS (Multi-Radar Multi-Sensor) Reflectivity at Lowest Altitude (RALA) data on an interactive map.

![Weather Radar Screenshot](docs/screenshot.png)

## Features

- **Real-time Radar Data**: Fetches latest radar data directly from NOAA MRMS
- **Interactive Map**: Pan, zoom, and explore radar coverage across CONUS
- **Click for Details**: Click anywhere on the map to see location coordinates
- **Auto-refresh**: Data automatically refreshes every 2 minutes
- **Dark Theme**: Optimized for radar visibility with dark map tiles
- **Color Legend**: NWS standard reflectivity color scale

## Technology Stack

- **Frontend**: Next.js 14+, React, TypeScript
- **Styling**: Tailwind CSS
- **Map**: Leaflet with react-leaflet
- **Data Processing**: Python with pygrib for GRIB2 parsing
- **Deployment**: Docker on Render.com

## Data Source

This application processes data directly from NOAA's MRMS system:
- **URL**: `https://mrms.ncep.noaa.gov/2D/ReflectivityAtLowestAltitude/`
- **Format**: GRIB2 (gzip compressed)
- **Coverage**: Continental United States (CONUS)
- **Resolution**: ~1km grid
- **Update Frequency**: Every 2 minutes

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.8+ with pip
- libeccodes (for pygrib)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd weather-radar
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Note on Local Development

The radar data processing requires Python with pygrib, which depends on the eccodes library. On Windows, you may need to install this via conda or use WSL. The Docker deployment handles all dependencies automatically.

## Deployment to Render

### Using Render Blueprint

1. Fork this repository to your GitHub account.

2. Go to [Render Dashboard](https://dashboard.render.com/).

3. Click "New" → "Blueprint".

4. Connect your GitHub repository.

5. Render will automatically detect the `render.yaml` and deploy the application.

### Manual Deployment

1. Go to [Render Dashboard](https://dashboard.render.com/).

2. Click "New" → "Web Service".

3. Connect your GitHub repository.

4. Configure the service:
   - **Name**: weather-radar
   - **Runtime**: Docker
   - **Instance Type**: Free
   - **Dockerfile Path**: ./Dockerfile

5. Click "Create Web Service".

The deployment will take a few minutes to build and start.

## Project Structure

```
weather-radar/
├── app/
│   ├── api/radar/route.ts    # Radar data API endpoint
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main page
│   └── globals.css           # Global styles
├── components/
│   ├── RadarMap.tsx          # Leaflet map component
│   ├── RadarMapWrapper.tsx   # Dynamic import wrapper
│   ├── Header.tsx            # App header
│   ├── Legend.tsx            # Color scale legend
│   ├── InfoPanel.tsx         # Click info display
│   └── LoadingSpinner.tsx    # Loading states
├── hooks/
│   └── useRadarData.ts       # Radar data fetching hook
├── lib/
│   ├── radar-processor.ts    # GRIB2 processing logic
│   ├── color-scale.ts        # dBZ to color mapping
│   └── utils.ts              # Utility functions
├── types/
│   └── radar.ts              # TypeScript interfaces
├── scripts/
│   └── process_grib2.py      # Python GRIB2 processor
├── Dockerfile                # Docker configuration
├── render.yaml               # Render deployment config
└── requirements.txt          # Python dependencies
```

## API Endpoints

### GET /api/radar

Fetches the latest radar data.

**Query Parameters:**
- `refresh=true` - Force refresh cached data

**Response:**
```json
{
  "imageUrl": "/radar/latest.png?1234567890",
  "timestamp": "2024-01-15T12:30:00.000Z",
  "bounds": [[21.0, -130.0], [55.0, -60.0]],
  "gridInfo": {
    "width": 7000,
    "height": 3500,
    "resolution": 1
  }
}
```

## Libraries Used

| Library | Purpose | Justification |
|---------|---------|---------------|
| react-leaflet | React wrapper for Leaflet | Standard approach for Leaflet + React integration |
| leaflet | Interactive maps | Industry-standard open-source mapping library |
| pygrib | GRIB2 parsing | Most reliable Python library for GRIB2 format |
| Pillow | Image generation | Standard Python imaging library |
| clsx + tailwind-merge | Class merging | Standard pattern for Tailwind CSS |

## License

MIT License
