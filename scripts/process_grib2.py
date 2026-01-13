#!/usr/bin/env python3
"""
GRIB2 Processor for MRMS Radar Data (Memory Optimized)

This script processes MRMS GRIB2 files and converts them to PNG images
with the standard NWS radar color scale.

Optimized for low memory environments (Render free tier ~512MB).

Usage:
    python process_grib2.py <input_grib2_file> <output_png_file>
"""

import sys
import json
import gzip
import tempfile
import os
import traceback
import gc
from datetime import datetime

print("Python GRIB2 processor starting...", file=sys.stderr)
print(f"Python version: {sys.version}", file=sys.stderr)

try:
    import numpy as np
    print(f"numpy version: {np.__version__}", file=sys.stderr)
except ImportError as e:
    print(json.dumps({"success": False, "error": f"numpy import failed: {str(e)}"}))
    sys.exit(1)

try:
    from PIL import Image
    print(f"PIL imported successfully", file=sys.stderr)
except ImportError as e:
    print(json.dumps({"success": False, "error": f"PIL import failed: {str(e)}"}))
    sys.exit(1)

try:
    import pygrib
    print(f"pygrib imported successfully", file=sys.stderr)
except ImportError as e:
    print(json.dumps({"success": False, "error": f"pygrib import failed: {str(e)}"}))
    sys.exit(1)


# NWS Radar Color Scale (dBZ ranges to RGBA) - using numpy arrays for vectorized ops
COLOR_THRESHOLDS = np.array([-999, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 999], dtype=np.float32)
COLOR_VALUES = np.array([
    [0, 0, 0, 0],           # Transparent - no precip (< 5)
    [4, 233, 231, 180],     # Light cyan (5-10)
    [1, 159, 244, 180],     # Cyan (10-15)
    [3, 0, 244, 180],       # Blue (15-20)
    [2, 253, 2, 180],       # Light green (20-25)
    [1, 197, 1, 180],       # Green (25-30)
    [0, 142, 0, 180],       # Dark green (30-35)
    [253, 248, 2, 180],     # Yellow (35-40)
    [229, 188, 0, 180],     # Gold (40-45)
    [253, 149, 0, 180],     # Orange (45-50)
    [253, 0, 0, 180],       # Red (50-55)
    [212, 0, 0, 180],       # Dark red (55-60)
    [188, 0, 0, 180],       # Darker red (60-65)
    [248, 0, 253, 180],     # Magenta (65-70)
    [152, 84, 198, 180],    # Purple (70-75)
    [255, 255, 255, 200],   # White (75+)
], dtype=np.uint8)


def apply_colormap_vectorized(data):
    """
    Apply color scale to data using vectorized numpy operations.
    Much faster and more memory efficient than per-pixel loops.
    """
    # Get color indices using digitize
    indices = np.digitize(data, COLOR_THRESHOLDS[1:-1])
    
    # Create output array
    height, width = data.shape
    rgba = np.zeros((height, width, 4), dtype=np.uint8)
    
    # Apply colors
    for i in range(4):
        rgba[:, :, i] = COLOR_VALUES[indices, i]
    
    return rgba


def process_grib2(input_file, output_file, downsample_factor=2):
    """
    Process a GRIB2 file and convert to PNG.
    
    Args:
        input_file: Path to input GRIB2 file (can be .gz compressed)
        output_file: Path to output PNG file
        downsample_factor: Reduce resolution by this factor to save memory (default: 2)
        
    Returns:
        dict: Metadata about the processed file
    """
    temp_file = None
    grbs = None
    
    try:
        print(f"Processing input file: {input_file}", file=sys.stderr)
        
        if not os.path.exists(input_file):
            return {"success": False, "error": f"Input file not found: {input_file}"}
        
        file_size = os.path.getsize(input_file)
        print(f"Input file size: {file_size} bytes", file=sys.stderr)
        
        # Handle gzipped files
        if input_file.endswith('.gz'):
            print("Decompressing gzip file...", file=sys.stderr)
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.grib2')
            with gzip.open(input_file, 'rb') as f_in:
                # Read in chunks to reduce peak memory
                while True:
                    chunk = f_in.read(1024 * 1024)  # 1MB chunks
                    if not chunk:
                        break
                    temp_file.write(chunk)
            temp_file.close()
            grib_path = temp_file.name
            print(f"Decompressed to: {grib_path}", file=sys.stderr)
        else:
            grib_path = input_file
        
        # Open GRIB2 file
        print(f"Opening GRIB2 file...", file=sys.stderr)
        grbs = pygrib.open(grib_path)
        
        # Get the first message
        grb = grbs[1]
        print(f"Processing: {grb.name}", file=sys.stderr)
        
        # Get metadata before loading full data
        valid_date = grb.validDate
        
        # Check scanning mode to determine data orientation
        # iScansNegatively: 0 = west to east, 1 = east to west
        # jScansPositively: 0 = north to south, 1 = south to north
        try:
            i_scans_neg = grb['iScansNegatively']
            j_scans_pos = grb['jScansPositively']
            print(f"Scanning mode: iScansNegatively={i_scans_neg}, jScansPositively={j_scans_pos}", file=sys.stderr)
        except Exception as e:
            print(f"Could not read scanning mode: {e}", file=sys.stderr)
            i_scans_neg = 0  # Assume west to east
            j_scans_pos = 1  # Assume south to north
        
        # Get bounds from message attributes (more memory efficient)
        lat_min = float(grb['latitudeOfFirstGridPointInDegrees'])
        lat_max = float(grb['latitudeOfLastGridPointInDegrees'])
        lon_min = float(grb['longitudeOfFirstGridPointInDegrees'])
        lon_max = float(grb['longitudeOfLastGridPointInDegrees'])
        
        print(f"Raw bounds: lat=[{lat_min}, {lat_max}], lon=[{lon_min}, {lon_max}]", file=sys.stderr)
        
        # Normalize longitude from 0-360 to -180 to 180
        # MRMS data uses 0-360 format, Leaflet needs -180 to 180
        if lon_min > 180:
            lon_min = lon_min - 360.0
            print(f"Normalized lon_min to {lon_min}", file=sys.stderr)
        if lon_max > 180:
            lon_max = lon_max - 360.0
            print(f"Normalized lon_max to {lon_max}", file=sys.stderr)
        
        # Ensure proper west/east ordering for bounds
        # After normalization, lon_min should be the western edge (smaller number)
        if lon_min > lon_max:
            lon_min, lon_max = lon_max, lon_min
            print(f"Swapped lon bounds for correct west/east ordering", file=sys.stderr)
        
        # Similarly for latitude (south should be smaller)
        if lat_min > lat_max:
            lat_min, lat_max = lat_max, lat_min
            print(f"Swapped lat bounds for correct south/north ordering", file=sys.stderr)
            
        print(f"Final bounds: lat=[{lat_min:.2f}, {lat_max:.2f}], lon=[{lon_min:.2f}, {lon_max:.2f}]", file=sys.stderr)
        
        # Extract data
        print("Loading data values...", file=sys.stderr)
        data = grb.values
        
        # Close GRIB file early to free memory
        grbs.close()
        grbs = None
        gc.collect()
        
        height, width = data.shape
        print(f"Original grid: {width}x{height}", file=sys.stderr)
        
        # Handle masked arrays
        if hasattr(data, 'mask'):
            data = np.ma.filled(data, -999).astype(np.float32)
        else:
            data = data.astype(np.float32)
        
        # Downsample to reduce memory and processing time
        if downsample_factor > 1:
            print(f"Downsampling by factor of {downsample_factor}...", file=sys.stderr)
            data = data[::downsample_factor, ::downsample_factor]
            height, width = data.shape
            print(f"Downsampled grid: {width}x{height}", file=sys.stderr)
        
        # Apply colormap using vectorized operations
        print("Applying color scale...", file=sys.stderr)
        rgba_data = apply_colormap_vectorized(data)
        
        # Free the raw data
        del data
        gc.collect()
        
        # Flip for correct orientation based on scanning mode
        # Vertical flip: if jScansPositively=1 (south to north), we need to flip
        # because image coordinates have origin at top-left
        if j_scans_pos == 1:
            print("Flipping vertically (jScansPositively=1)", file=sys.stderr)
            rgba_data = np.flipud(rgba_data)
        
        # Horizontal flip: if iScansNegatively=1 (east to west), we need to flip
        # to get west on the left side of the image
        if i_scans_neg == 1:
            print("Flipping horizontally (iScansNegatively=1)", file=sys.stderr)
            rgba_data = np.fliplr(rgba_data)
        
        # Create and save image
        print("Saving PNG image...", file=sys.stderr)
        img = Image.fromarray(rgba_data, mode='RGBA')
        
        # Free rgba_data
        del rgba_data
        gc.collect()
        
        # Ensure output directory exists
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Save with compression to reduce file size
        img.save(output_file, 'PNG', optimize=True)
        
        del img
        gc.collect()
        
        # Calculate resolution
        lat_range = abs(lat_max - lat_min)
        resolution_km = (lat_range * 111) / height * downsample_factor
        
        print("Processing complete!", file=sys.stderr)
        
        return {
            "success": True,
            "timestamp": valid_date.isoformat(),
            "bounds": [[min(lat_min, lat_max), lon_min], [max(lat_min, lat_max), lon_max]],
            "gridInfo": {
                "width": width,
                "height": height,
                "resolution": round(resolution_km, 2)
            }
        }
        
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"ERROR: {error_msg}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return {"success": False, "error": error_msg}
    
    finally:
        if grbs is not None:
            try:
                grbs.close()
            except:
                pass
        if temp_file is not None:
            try:
                os.unlink(temp_file.name)
            except:
                pass
        gc.collect()


def main():
    try:
        if len(sys.argv) != 3:
            print(json.dumps({
                "success": False,
                "error": f"Usage: python process_grib2.py <input_file> <output_file>"
            }))
            sys.exit(1)
        
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        
        print(f"Input: {input_file}", file=sys.stderr)
        print(f"Output: {output_file}", file=sys.stderr)
        
        # Use downsample factor of 3 to reduce memory and speed up processing
        # Still provides ~1167x2333 resolution which is good for web display
        result = process_grib2(input_file, output_file, downsample_factor=3)
        print(json.dumps(result))
        
        if not result.get("success", False):
            sys.exit(1)
            
    except Exception as e:
        error_msg = f"Unhandled: {type(e).__name__}: {str(e)}"
        print(f"FATAL: {error_msg}", file=sys.stderr)
        print(json.dumps({"success": False, "error": error_msg}))
        sys.exit(1)


if __name__ == "__main__":
    main()
