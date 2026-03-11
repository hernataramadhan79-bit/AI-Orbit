"""Test script untuk memeriksa konektivitas ke OpenRouter API"""
import asyncio
import httpx

async def test_openrouter():
    api_key = "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"
    
    # Test 1: Get available models
    print("=== Test 1: Get Models ===")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")
    
    # Test 2: Try to generate a simple response with qwen model
    print("\n=== Test 2: Generate with Qwen ===")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://ai-orbit.com",
                    "X-Title": "AI Orbit"
                },
                json={
                    "model": "qwen/qwen-2.5-coder-32b-instruct",
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 10
                },
                timeout=30.0
            )
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:1000]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_openrouter())
