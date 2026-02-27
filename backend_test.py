import requests
import sys
from datetime import datetime, timezone
import json

class BelgaonkarGymAPITester:
    def __init__(self, base_url="https://belgaonkar-gym.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.staff_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_member_id = None
        self.created_package_id = None
        self.created_payment_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@belgaonkar.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin role: {response.get('user', {}).get('role', 'unknown')}")
            return True
        return False

    def test_staff_login(self):
        """Test staff login"""
        success, response = self.run_test(
            "Staff Login",
            "POST",
            "auth/login",
            200,
            data={"email": "staff@belgaonkar.com", "password": "staff123"}
        )
        if success and 'access_token' in response:
            self.staff_token = response['access_token']
            print(f"   Staff role: {response.get('user', {}).get('role', 'unknown')}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        success, _ = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User (Admin)",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   User: {response.get('full_name')} ({response.get('role')})")
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Total Members: {response.get('total_members')}")
            print(f"   Active Members: {response.get('active_members')}")
            print(f"   Expiring Soon: {response.get('expiring_in_5_days')}")
            print(f"   Today's Collection: ₹{response.get('todays_collection')}")
        return success

    def test_get_packages(self):
        """Test getting all packages"""
        success, response = self.run_test(
            "Get Packages",
            "GET",
            "packages",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} packages")
            for pkg in response[:3]:  # Show first 3
                print(f"   - {pkg.get('package_name')}: {pkg.get('duration_days')} days, ₹{pkg.get('price')}")
        return success

    def test_create_package_admin(self):
        """Test creating package as admin"""
        success, response = self.run_test(
            "Create Package (Admin)",
            "POST",
            "packages",
            200,
            data={
                "package_name": "Test Package",
                "duration_days": 15,
                "price": 800.0
            },
            token=self.admin_token
        )
        if success:
            self.created_package_id = response.get('id')
            print(f"   Created package ID: {self.created_package_id}")
        return success

    def test_create_package_staff(self):
        """Test creating package as staff (should fail)"""
        success, _ = self.run_test(
            "Create Package (Staff - Should Fail)",
            "POST",
            "packages",
            403,
            data={
                "package_name": "Staff Test Package",
                "duration_days": 10,
                "price": 500.0
            },
            token=self.staff_token
        )
        return success

    def test_get_members(self):
        """Test getting all members"""
        success, response = self.run_test(
            "Get Members",
            "GET",
            "members",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} members")
            for member in response[:3]:  # Show first 3
                print(f"   - {member.get('full_name')}: {member.get('phone_number')}")
        return success

    def test_create_member(self):
        """Test creating a new member"""
        # First get a package ID
        success, packages = self.run_test(
            "Get Packages for Member Creation",
            "GET",
            "packages",
            200,
            token=self.admin_token
        )
        
        if not success or not packages:
            print("   ❌ No packages available for member creation")
            return False

        package_id = packages[0]['id']
        package_price = packages[0]['price']
        
        success, response = self.run_test(
            "Create Member",
            "POST",
            "members",
            200,
            data={
                "full_name": "Test Member",
                "phone_number": "9999999999",
                "package_id": package_id,
                "join_date": datetime.now(timezone.utc).isoformat(),
                "payment_status": "Partial",
                "total_amount": package_price,
                "amount_paid": 1000.0,
                "assigned_trainer": "Test Trainer"
            },
            token=self.admin_token
        )
        if success:
            self.created_member_id = response.get('id')
            print(f"   Created member ID: {self.created_member_id}")
        return success

    def test_get_member_profile(self):
        """Test getting specific member profile"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Member Profile",
            "GET",
            f"members/{self.created_member_id}",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Member: {response.get('full_name')}")
            print(f"   Status: {response.get('payment_status')}")
            print(f"   Amount Paid: ₹{response.get('amount_paid')}")
        return success

    def test_search_members(self):
        """Test member search functionality"""
        success, response = self.run_test(
            "Search Members",
            "GET",
            "members/search/Test",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} members matching 'Test'")
        return success

    def test_mark_attendance(self):
        """Test marking attendance"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for attendance testing")
            return False
            
        success, response = self.run_test(
            "Mark Attendance",
            "POST",
            "attendance",
            200,
            data={"member_id": self.created_member_id},
            token=self.admin_token
        )
        return success

    def test_mark_attendance_duplicate(self):
        """Test marking attendance twice (should fail)"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for duplicate attendance testing")
            return False
            
        success, _ = self.run_test(
            "Mark Attendance Duplicate (Should Fail)",
            "POST",
            "attendance",
            400,
            data={"member_id": self.created_member_id},
            token=self.admin_token
        )
        return success

    def test_get_member_attendance(self):
        """Test getting member attendance history"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for attendance history testing")
            return False
            
        success, response = self.run_test(
            "Get Member Attendance",
            "GET",
            f"attendance/member/{self.created_member_id}",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} attendance records")
        return success

    def test_record_payment(self):
        """Test recording a payment"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for payment testing")
            return False
            
        success, response = self.run_test(
            "Record Payment",
            "POST",
            "payments",
            200,
            data={
                "member_id": self.created_member_id,
                "amount_paid": 500.0,
                "payment_mode": "UPI",
                "payment_date": datetime.now(timezone.utc).isoformat()
            },
            token=self.admin_token
        )
        if success:
            self.created_payment_id = response.get('id')
            print(f"   Payment ID: {self.created_payment_id}")
            print(f"   Invoice: {response.get('invoice_number')}")
        return success

    def test_get_member_payments(self):
        """Test getting member payment history"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for payment history testing")
            return False
            
        success, response = self.run_test(
            "Get Member Payments",
            "GET",
            f"payments/member/{self.created_member_id}",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} payment records")
        return success

    def test_get_all_payments_admin(self):
        """Test getting all payments as admin"""
        success, response = self.run_test(
            "Get All Payments (Admin)",
            "GET",
            "payments",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Found {len(response)} total payments")
        return success

    def test_get_all_payments_staff(self):
        """Test getting all payments as staff (should fail)"""
        success, _ = self.run_test(
            "Get All Payments (Staff - Should Fail)",
            "GET",
            "payments",
            403,
            token=self.staff_token
        )
        return success

    def test_dashboard_reports(self):
        """Test dashboard report endpoints"""
        endpoints = [
            ("expiring-members", "Expiring Members"),
            ("inactive-members", "Inactive Members"), 
            ("pending-payments", "Pending Payments"),
            ("birthday-today", "Birthday Today")
        ]
        
        all_passed = True
        for endpoint, name in endpoints:
            success, response = self.run_test(
                f"Dashboard {name}",
                "GET",
                f"dashboard/{endpoint}",
                200,
                token=self.admin_token
            )
            if success:
                print(f"   Found {len(response)} {name.lower()}")
            all_passed = all_passed and success
        
        return all_passed

    def test_invoice_generation(self):
        """Test invoice PDF generation"""
        if not self.created_payment_id:
            print("   ⚠️ No payment ID available for invoice testing")
            return False
            
        # Test invoice endpoint (should return PDF)
        url = f"{self.base_url}/api/invoice/{self.created_payment_id}"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Invoice Generation...")
        
        try:
            response = requests.get(url, headers=headers)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - PDF generated successfully")
                print(f"   Content-Type: {response.headers.get('content-type')}")
                print(f"   Content-Length: {len(response.content)} bytes")
            else:
                print(f"❌ Failed - Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
            
            return success
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_update_member(self):
        """Test updating member information"""
        if not self.created_member_id:
            print("   ⚠️ No member ID available for update testing")
            return False
            
        success, response = self.run_test(
            "Update Member",
            "PATCH",
            f"members/{self.created_member_id}",
            200,
            data={"assigned_trainer": "Updated Trainer"},
            token=self.admin_token
        )
        if success:
            print(f"   Updated trainer: {response.get('assigned_trainer')}")
        return success

    def test_delete_package(self):
        """Test deleting package as admin"""
        if not self.created_package_id:
            print("   ⚠️ No package ID available for deletion testing")
            return False
            
        success, _ = self.run_test(
            "Delete Package (Admin)",
            "DELETE",
            f"packages/{self.created_package_id}",
            200,
            token=self.admin_token
        )
        return success

    def test_delete_package_staff(self):
        """Test deleting package as staff (should fail)"""
        # Get any package ID first
        success, packages = self.run_test(
            "Get Packages for Staff Delete Test",
            "GET",
            "packages",
            200,
            token=self.staff_token
        )
        
        if not success or not packages:
            print("   ⚠️ No packages available for staff delete testing")
            return False

        package_id = packages[0]['id']
        success, _ = self.run_test(
            "Delete Package (Staff - Should Fail)",
            "DELETE",
            f"packages/{package_id}",
            403,
            token=self.staff_token
        )
        return success

def main():
    print("🏋️ Starting Belgaonkar Fitness Gym API Testing...")
    print("=" * 60)
    
    tester = BelgaonkarGymAPITester()
    
    # Authentication Tests
    print("\n📋 AUTHENTICATION TESTS")
    print("-" * 30)
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_staff_login():
        print("❌ Staff login failed, stopping tests")
        return 1
    
    tester.test_invalid_login()
    tester.test_get_current_user()
    
    # Dashboard Tests
    print("\n📊 DASHBOARD TESTS")
    print("-" * 30)
    tester.test_dashboard_stats()
    tester.test_dashboard_reports()
    
    # Package Tests
    print("\n📦 PACKAGE TESTS")
    print("-" * 30)
    tester.test_get_packages()
    tester.test_create_package_admin()
    tester.test_create_package_staff()
    
    # Member Tests
    print("\n👥 MEMBER TESTS")
    print("-" * 30)
    tester.test_get_members()
    tester.test_create_member()
    tester.test_get_member_profile()
    tester.test_search_members()
    tester.test_update_member()
    
    # Attendance Tests
    print("\n📅 ATTENDANCE TESTS")
    print("-" * 30)
    tester.test_mark_attendance()
    tester.test_mark_attendance_duplicate()
    tester.test_get_member_attendance()
    
    # Payment Tests
    print("\n💰 PAYMENT TESTS")
    print("-" * 30)
    tester.test_record_payment()
    tester.test_get_member_payments()
    tester.test_get_all_payments_admin()
    tester.test_get_all_payments_staff()
    tester.test_invoice_generation()
    
    # Role-based Access Tests
    print("\n🔐 ROLE-BASED ACCESS TESTS")
    print("-" * 30)
    tester.test_delete_package_staff()
    tester.test_delete_package()  # Admin delete (cleanup)
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed = tester.tests_run - tester.tests_passed
        print(f"⚠️ {failed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())