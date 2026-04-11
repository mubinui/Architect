import httpx
import base64
import sys

API_URL = "http://localhost:8000/api"

def test_generation():
    # 1. Create a project
    payload = {
        "name": "Test Automation Project",
        "design_context": {
            "style": "minimalist",
            "primary_colors": ["white", "black"],
            "accent_colors": ["sage_green"],
            "material_palette": ["light_oak", "matte_metal"],
            "lighting_mood": "bright and natural",
            "texture_preferences": ["linen", "smooth_concrete"],
            "overall_description": "A very peaceful, minimalistic place."
        },
        "rooms": [
            {
                "name": "Main Bedroom",
                "room_type": "bedroom",
                "dimensions": {
                    "width": 4.0,
                    "height": 2.8,
                    "length": 5.0
                },
                "color_preferences": ["white", "blue"],
                "furniture_preferences": ["platform bed", "small nightstand"],
                "notes": "Keep it super simple."
            }
        ]
    }
    
    print("Creating project...")
    try:
        resp = httpx.post(f"{API_URL}/projects", json=payload)
        resp.raise_for_status()
        project = resp.json()
        project_id = project["id"]
        print(f"Created project {project_id}")
    except Exception as e:
        print(f"Error creating project: {e}")
        if hasattr(e, 'response') and e.response is hasattr(e, 'response') is not None:
            print(e.response.text)
        sys.exit(1)

    # 2. Trigger generation
    print(f"Generating room for project {project_id} (this might take a few seconds)...")
    try:
        gen_resp = httpx.post(f"{API_URL}/projects/{project_id}/generate", timeout=120.0)
        gen_resp.raise_for_status()
        gen_data = gen_resp.json()
    except Exception as e:
        print(f"Error generating room: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(e.response.text)
        sys.exit(1)
        
    print("Generation complete:")
    print(f"Successful: {gen_data['successful']}, Failed: {gen_data['failed']}")
    
    for res in gen_data.get("results", []):
        print(f"Room: {res['room_name']}")
        if res.get("status") == "error":
            print(f"Error: {res['error']}")
        else:
            print(f"Prompt: {res['generated_prompt']}")
            img_b64 = res.get('image_base64', '')
            print("Image generated successfully (base64 length:", len(img_b64), ")")
            if img_b64:
                try:
                    # sometimes prefixes like data:image/jpeg;base64, are returned.
                    img_data = img_b64.split(",")[-1] if "," in img_b64 else img_b64
                    with open("test_output.jpg", "wb") as f:
                        f.write(base64.b64decode(img_data))
                    print("Saved image to test_output.jpg")
                except Exception as e:
                    print("Could not save image:", e)

if __name__ == "__main__":
    test_generation()
