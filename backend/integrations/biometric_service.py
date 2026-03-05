import logging
from zk import ZK, const

logger = logging.getLogger(__name__)

class BiometricService:
    def __init__(self, ip_address, port=4370, timeout=10, password=0):
        self.ip_address = ip_address
        self.port = port
        self.timeout = timeout
        self.password = password
        self.zk = ZK(self.ip_address, port=self.port, timeout=self.timeout, password=self.password, force_udp=False, ommit_ping=False)
        self.conn = None

    def connect(self):
        try:
            self.conn = self.zk.connect()
            # self.conn.disable_device() # Some devices hang on this, be careful. Better to skip unless needed.
            return True, "Connected successfully"
        except Exception as e:
            logger.error(f"Error connecting to biometric device {self.ip_address}: {e}")
            return False, str(e)

    def disconnect(self):
        if self.conn:
            try:
                # self.conn.enable_device()
                self.conn.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting from biometric device {self.ip_address}: {e}")
            finally:
                self.conn = None

    def get_attendance(self):
        if not self.conn:
            success, _ = self.connect()
            if not success:
                return []
        
        try:
            attendance = self.conn.get_attendance()
            return attendance
        except Exception as e:
            logger.error(f"Error getting attendance from {self.ip_address}: {e}")
            return []
            
    def clear_attendance(self):
        if not self.conn:
            success, _ = self.connect()
            if not success:
                return False
                
        try:
            self.conn.clear_attendance()
            return True
        except Exception as e:
            logger.error(f"Error clearing attendance on {self.ip_address}: {e}")
            return False

    def get_users(self):
        if not self.conn:
            success, _ = self.connect()
            if not success:
                return []
                
        try:
            return self.conn.get_users()
        except Exception as e:
            logger.error(f"Error getting users from {self.ip_address}: {e}")
            return []

    def test_connection(self):
        success, message = self.connect()
        if success:
            self.disconnect()
        return success, message
