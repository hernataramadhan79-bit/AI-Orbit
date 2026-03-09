# Use Python 3.12 (Slim for smaller image size)
FROM python:3.12-slim

# Set working directory
WORKDIR /code

# Install system dependencies (needed for ChromaDB and LangChain)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the application code
COPY ./app /code/app

# Create necessary directories
RUN mkdir -p /code/uploads /code/data/chroma

# Set permissions (Hugging Face runs as user 1000)
RUN chmod -R 777 /code/uploads /code/data/chroma

# Expose the port used by Hugging Face Spaces
EXPOSE 7860

# Command to run the application
# We use 0.0.0.0 to allow external access and port 7860 for Hugging Face
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
