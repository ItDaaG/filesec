"""
Storage limits for different account tiers
"""
# Storage limits in bytes
STORAGE_LIMITS = {
    "standard": 10 * 1024 * 1024 * 1024,  # 10 GB
    "pro": 100 * 1024 * 1024 * 1024,  # 100 GB
    "pro+": 1024 * 1024 * 1024 * 1024,  # 1 TB
}


def get_storage_limit_bytes(account_tier: str) -> int:
    """Get storage limit in bytes for a given account tier."""
    return STORAGE_LIMITS.get(account_tier, STORAGE_LIMITS["standard"])
