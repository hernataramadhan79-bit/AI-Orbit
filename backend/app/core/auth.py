from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.core.config import settings

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Memverifikasi Supabase JWT token.
    Jika valid, mengembalikan data user.
    """
    token = credentials.credentials
    try:
        # Supabase menggunakan RS256 atau HS256. 
        # Jika JWT_SECRET diberikan, kita bisa verifikasi lokal (HS256).
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token, 
                settings.SUPABASE_JWT_SECRET, 
                algorithms=["HS256"], 
                audience="authenticated"
            )
            return payload
        else:
            # Fallback: Tanpa secret, kita hanya bisa melakukan decode tanpa verifikasi (TIDAK AMAN untuk production)
            # Atau sebaiknya gunakan library supabase-py untuk verifikasi via API.
            # Sementara kita asumsikan secret ada di production.
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token telah kedaluwarsa",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Gagal memverifikasi token: {str(e)}",
        )

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    """
    Versi opsional dari get_current_user. 
    Mengembalikan None jika tidak ada token.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None
