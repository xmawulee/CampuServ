import os
import sys

print("Python version:", sys.version)

try:
    from PIL import Image
    print("Pillow is installed! Beginning conversion...")
    
    # Files to convert
    files = [
        'assets/images/bg_tile@4x.png',
        'assets/images/home/design_print.png',
        'assets/images/home/cleaning.png'
    ]
    
    for f in files:
        if os.path.exists(f):
            print(f"Converting {f} to valid PNG...")
            im = Image.open(f)
            # Save it back as PNG, replacing the JPEG-encoded data
            im.save(f, 'PNG')
            print(f"Successfully converted {f} to PNG.")
        else:
            print(f"Warning: file {f} not found.")
            
    print("Image conversion completed successfully!")
except ImportError:
    print("ERROR: Pillow is not installed in your Python environment.")
    print("Please install it by running the following command in your terminal:")
    print("  pip install Pillow")
    sys.exit(1)
except Exception as e:
    print("ERROR during conversion:", e)
    sys.exit(1)
