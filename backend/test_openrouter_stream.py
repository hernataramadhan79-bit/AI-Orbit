"""Test script untuk memeriksa streaming ke OpenRouter API"""
import asyncio
import httpx

async def test_openrouter_stream():
    api_key = "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"
    
    # Test streaming dengan Qwen
    print("=== Test: Streaming with Qwen ===")
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://ai-orbit.com",
                    "X-Title": "AI Orbit"
                },
                json={
                    "model": "qwen/qwen-2.5-coder-32b-instruct",
                    "messages": [{"role": "user", "content": "Write a short poem about AI"}],
                    "max_tokens": 100,
                    "stream": True
                },
                timeout=30.0
            ) as resp:
                print(f"Status: {resp.status_code}")
                print(f"Headers: {dict(resp.headers)}")
                print("\n--- Stream Content ---")
                async for line in resp.aiter_lines():
                    if line.strip():
                        print(line)
                        if line.startswith("data: [DONE]"):
                            break
        except Exception as e:
            print(f"Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_openrouter_stream())
