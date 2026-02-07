from typing import List
import open_clip
import torch
from PIL import Image
import subprocess
import tempfile
import os
from transformers import BlipProcessor, BlipForConditionalGeneration
# Remove svglib/reportlab imports
# from svglib.svglib import svg2rlg
# from reportlab.graphics import renderPM

class SVGEmbedder:
    """
    Class to handle SVG embedding using OpenCLIP.
    """
    def __init__(self):
        self._caption_processor = None
        self._caption_model = None

    def _get_captioner(self):
        if self._caption_processor is None or self._caption_model is None:
            self._caption_processor = BlipProcessor.from_pretrained(
                "Salesforce/blip-image-captioning-base"
            )
            self._caption_model = BlipForConditionalGeneration.from_pretrained(
                "Salesforce/blip-image-captioning-base"
            )
            self._caption_model.eval()
        return self._caption_processor, self._caption_model

    def embed_svg(self, svg_content: str) -> list:
        """
        Embed an SVG string using OpenCLIP's vision encoder.
        
        Args:
            svg_content: SVG content as string (from database)
            
        Returns:
            [embedding_list, caption]
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

            # Generate a caption using BLIP (large)
            caption_processor, caption_model = self._get_captioner()
            caption_inputs = caption_processor(images=image, return_tensors="pt")
            caption_ids = caption_model.generate(
                **caption_inputs,
                max_new_tokens=40
            )
            caption = caption_processor.decode(
                caption_ids[0],
                skip_special_tokens=True
            ).strip()

        return [embedding.squeeze(0).tolist(), caption]
    

def test():
    # Example usage
    with open('Public/Images/Test/dog.svg', 'r') as f:
        svg_data = f.read()
    
    embedder = SVGEmbedder()
    embedding, caption = embedder.embed_svg(svg_data)
    print("Embedding:", embedding)
    print("Caption:", caption)

test()

