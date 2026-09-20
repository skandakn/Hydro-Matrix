"""
HYDRO MATRIX : Exotel Cloud Telephony & Automated IVR Dispatch Service
Manages automated citizen outbound voice broadcast queues and emergency hotline webhooks.
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("hydro_matrix.exotel_telephony")


class ExotelCloudTelephonyService:
    """
    Interfaces with the Exotel Cloud Telephony API (Asia-South Mumbai Region)
    for outbound automated emergency warning voice broadcasts to citizens.
    """

    def __init__(self):
        self.account_sid = os.getenv("EXOTEL_ACCOUNT_SID", "")
        self.api_key = os.getenv("EXOTEL_API_KEY", "")
        self.api_token = os.getenv("EXOTEL_API_TOKEN", "")
        self.caller_id = os.getenv("EXOTEL_CALLER_ID", "")
        self.subdomain = os.getenv("EXOTEL_SUBDOMAIN", "api.exotel.com")

    def is_configured(self) -> bool:
        """Returns True if all required Exotel API credentials are present."""
        return bool(self.account_sid and self.api_key and self.api_token and self.caller_id)

    async def dispatch_emergency_broadcast_call(
        self,
        target_phone_number: str,
        location_ward: str,
        alert_level: str = "DEFCON_1_CRITICAL",
        custom_caller_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches an automated priority voice call to a citizen's registered phone
        in an inundated sector with automated IVR audio advisory.
        """
        if not self.is_configured():
            logger.warning("Exotel telephony not configured with real credentials; simulating dispatch.")
            return {
                "status": "SIMULATED_DISPATCH",
                "call_id": f"exo_sim_{int(os.times().system * 1000)}",
                "target_phone": target_phone_number,
                "location_ward": location_ward,
                "alert_level": alert_level,
                "message": "Automated voice alert queued for immediate carrier handoff.",
            }

        import httpx
        url = f"https://{self.api_key}:{self.api_token}@{self.subdomain}/v1/Accounts/{self.account_sid}/Calls/connect.json"
        payload = {
            "From": target_phone_number,
            "CallerId": custom_caller_id or self.caller_id,
            "Url": f"http://my.exotel.com/{self.account_sid}/exomls/flood_alert",
            "TimeLimit": "300",
            "CustomField": f"ward:{location_ward};alert:{alert_level}",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=payload)
                if res.status_code == 200:
                    data = res.json()
                    call_sid = data.get("Call", {}).get("Sid")
                    return {
                        "status": "QUEUED_LIVE",
                        "call_id": call_sid,
                        "target_phone": target_phone_number,
                        "location_ward": location_ward,
                    }
                else:
                    return {
                        "status": "FAILED",
                        "http_code": res.status_code,
                        "error": res.text,
                    }
        except Exception as err:
            logger.error(f"Exotel call exception: {err}")
            return {"status": "ERROR", "error": str(err)}
