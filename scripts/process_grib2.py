#!/usr/bin/env python3
"""
GRIB2 Processor for MRMS Radar Data

This script processes MRMS GRIB2 files and converts them to PNG images
with the standard NWS radar color scale.

Usage:
    python process_grib2.py <input_grib2_file> <output_png_file>

Output:
    - PNG file with radar reflectivity data
    - JSON metadata printed to stdout
"""

import sys
import json
import gzip
import tempfile
import os
from datetime import datetime

import numpy as np
from PIL import Image

try:
    import pygrib
except ImportError:
    print(json.dumps({"error": "pygrib not installed"}))
    sys.exit(1)


# NWS Radar Color Scale (dBZ ranges to RGBA)
COLOR_SCALE = [
    (-999, 5, (0, 0, 0, 0)),           # Transparent - no precip
    (5, 10, (4, 233, 231, 180)),       # Light cyan
    (10, 15, (1, 159, 244, 180)),      # Cyan
    (15, 20, (3, 0, 244, 180)),        # Blue
    (20, 25, (2, 253, 2, 180)),        # Light green
    (25, 30, (1, 197, 1, 180)),        # Green
    (30, 35, (0, 142, 0, 180)),        # Dark green
    (35, 40, (253, 248, 2, 180)),      # Yellow
    (40, 45, (229, 188, 0, 180)),      # Gold
    (45, 50, (253, 149, 0, 180)),      # Orange
    (50, 55, (253, 0, 0, 180)),        # Red
    (55, 60, (212, 0, 0, 180)),        # Dark red
    (60, 65, (188, 0, 0, 180)),        # Darker red
    (65, 70, (248, 0, 253, 180)),      # Magenta
    (70, 75, (152, 84, 198, 180)),     # Purple
    (75, 999, (255, 255, 255, 200)),   # White
]


def dbz_to_rgba(dbz_value):
    """Convert a dBZ value to RGBA color tuple."""
    for min_dbz, max_dbz, rgba in COLOR_SCALE:
        if min_dbz <= dbz_value < max_dbz:
            return rgba
    return (0, 0, 0, 0)  # Default transparent


def process_grib2(input_file, output_file):
    """
    Process a GRIB2 file and convert to PNG.
    
    Args:
        input_file: Path to input GRIB2 file (can be .gz compressed)
        output_file: Path to output PNG file
        
    Returns:
        dict: Metadata about the processed file
    """
    temp_file = None
    
    try:
        # Handle gzipped files
        if input_file.endswith('.gz'):
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.grib2')
            with gzip.open(input_file, 'rb') as f_in:
                temp_file.write(f_in.read())
            temp_file.close()
            grib_path = temp_file.name
        else:
            grib_path = input_file
        
        # Open GRIB2 file
        grbs = pygrib.open(grib_path)
        
        # Get the first (and usually only) message
        grb = grbs[1]
        
        # Extract data
        data = grb.values
        lats, lons = grb.latlons()
        
        # Get metadata
        valid_date = grb.validDate
        
        # Get bounds
        lat_min = float(np.min(lats))
        lat_max = float(np.max(lats))
        lon_min = float(np.min(lons))
        lon_max = float(np.max(lons))
        
        # Data dimensions
        height, width = data.shape
        
        # Create RGBA image
        rgba_data = np.zeros((height, width, 4), dtype=np.uint8)
        
        # Handle masked arrays (missing data)
        if hasattr(data, 'mask'):
            data_filled = np.ma.filled(data, -999)
        else:
            data_filled = data
        
        # Apply color scale
        for i in range(height):
            for j in range(width):
                dbz = data_filled[i, j]
                rgba_data[i, j] = dbz_to_rgba(dbz)
        
        # The GRIB2 data is typically stored with north at top
        # but we need to flip it for proper image orientation
        rgba_data = np.flipud(rgba_data)
        
        # Create and save image
        img = Image.fromarray(rgba_data, mode='RGBA')
        img.save(output_file, 'PNG')
        
        grbs.close()
        
        # Calculate resolution (approximate)
        lat_range = lat_max - lat_min
        resolution_km = (lat_range * 111) / height  # 111 km per degree latitude
        
        metadata = {
            "success": True,
            "timestamp": valid_date.isoformat(),
            "bounds": [[lat_min, lon_min], [lat_max, lon_max]],
            "gridInfo": {
                "width": width,
                "height": height,
                "resolution": round(resolution_km, 2)
            },
            "outputFile": output_file
        }
        
        return metadata
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    
    finally:
        # Clean up temp file
        if temp_file is not None:
            try:
                os.unlink(temp_file.name)
            except:
                pass


def main():
    if len(sys.argv) != 3:
        print(json.dumps({
            "error": "Usage: python process_grib2.py <input_file> <output_file>"
        }))
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(json.dumps({
            "error": f"Input file not found: {input_file}"
        }))
        sys.exit(1)
    
    result = process_grib2(input_file, output_file)
    print(json.dumps(result))
    
    if not result.get("success", False):
        sys.exit(1)


if __name__ == "__main__":
    main()
