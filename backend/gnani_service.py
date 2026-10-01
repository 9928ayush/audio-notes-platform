import os
import requests
import tempfile
import boto3

def download_from_s3(s3_url: str) -> str:
    """Helper to download the file locally for the ASR API if it requires a direct file upload."""
    s3 = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    bucket = os.getenv('AWS_BUCKET_NAME')
    # Extract key from URL format: https://bucket.s3.amazonaws.com/key
    key = s3_url.split(f"{bucket}.s3.amazonaws.com/")[-1]
    
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    s3.download_file(bucket, key, tmp_file.name)
    return tmp_file.name

def transcribe_audio(file_path_or_url: str) -> str:
    token = os.getenv("GNANI_API_TOKEN")
    if not token:
        raise ValueError("GNANI_API_TOKEN missing.")

    headers = {"X-API-Key-ID": token}
    api_url = "https://api.vachana.ai/stt/v3" 
    
    local_file_path = None
    is_downloaded = False
    try:
        # Check if we have a real S3 URL or a local bypass file
        if file_path_or_url.startswith("http"):
            local_file_path = download_from_s3(file_path_or_url)
            is_downloaded = True
        else:
            local_file_path = file_path_or_url

        with open(local_file_path, 'rb') as audio_file:
            response = requests.post(
                api_url, 
                headers=headers, 
                files={"audio_file": audio_file}, 
                data={"language_code": "en-IN"},
                timeout=300
            )
        
        response.raise_for_status()
        data = response.json()
        return data.get("text") or data.get("transcript", "")
        
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Gnani ASR API request failed: {str(e)}")
    finally:
        # Only clean up if we created a temporary file from S3
        if is_downloaded and local_file_path and os.path.exists(local_file_path):
            os.remove(local_file_path)