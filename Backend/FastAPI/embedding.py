from typing import List
import open_clip
import torch
from PIL import Image
import subprocess
import tempfile
import os
# Remove svglib/reportlab imports
# from svglib.svglib import svg2rlg
# from reportlab.graphics import renderPM

class SVGEmbedder:
    """
    Class to handle SVG embedding using OpenCLIP.
    """
    def embed_svg(self, svg_content: str) -> List[float]:
        """
        Embed an SVG string using OpenCLIP's vision encoder.
        
        Args:
            svg_content: SVG content as string (from database)
            
        Returns:
            Embedding as a list of floats
        """
        # Load OpenCLIP model
        model, _, preprocess = open_clip.create_model_and_transforms(
            'ViT-B-32',
            pretrained='openai'
        )
        model.eval()
        
        # Convert SVG to PNG using inkscape (no cairo needed)
        with tempfile.NamedTemporaryFile(suffix='.svg', delete=False, mode='w', encoding='utf-8') as svg_file:
            svg_file.write(svg_content)
            svg_path = svg_file.name
        
        png_path = svg_path.replace('.svg', '.png')
        subprocess.run(['inkscape', '--export-type=png', '--export-filename=' + png_path, svg_path], check=True, capture_output=True)
        
        # Open image and preprocess
        image = Image.open(png_path).convert('RGB')
        image_tensor = preprocess(image).unsqueeze(0)
        
        # Clean up temp files
        os.unlink(svg_path)
        os.unlink(png_path)
        
        # Generate embedding
        with torch.no_grad():
            embedding = model.encode_image(image_tensor)
        
        return embedding.squeeze(0).tolist()


