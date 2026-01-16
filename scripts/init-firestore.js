/**
 * Firestore Database Initialization Script
 *
 * Run this script once to set up the initial roles in your Firestore database.
 * You can run it from the Firebase Console or through a Node.js script.
 *
 * To use with Firebase Admin SDK:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Get your service account key from Firebase Console
 * 3. Run: node scripts/init-firestore.js
 */

// Default roles configuration
const DEFAULT_ROLES = {
  admin: {
    name: 'Administrator',
    description: 'Full access to all features and settings',
    permissions: [
      'view_dashboard',
      'view_analytics',
      'view_users',
      'create_users',
      'edit_users',
      'delete_users',
      'manage_roles',
      'manage_menus',
      'view_reports',
      'create_reports',
      'export_reports',
      'view_settings',
      'edit_settings',
      'view_all_data',
      'view_own_data',
      'edit_own_data',
    ],
  },
  manager: {
    name: 'Manager',
    description: 'Can view reports, analytics, and manage data',
    permissions: [
      'view_dashboard',
      'view_analytics',
      'view_users',
      'view_reports',
      'create_reports',
      'export_reports',
      'view_all_data',
      'view_own_data',
      'edit_own_data',
    ],
  },
  user: {
    name: 'User',
    description: 'Basic access to personal data and dashboard',
    permissions: ['view_dashboard', 'view_own_data', 'edit_own_data'],
  },
}

// Sample activities for demo
const SAMPLE_ACTIVITIES = [
  {
    userId: 'system',
    userEmail: 'system@example.com',
    userName: 'System',
    action: 'System initialized',
    details: 'The dashboard system was initialized with default roles',
    type: 'success',
    timestamp: new Date(),
  },
]

// Default menus configuration
const DEFAULT_MENUS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    permission: 'view_dashboard',
    order: 0,
    isActive: true,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: 'BarChart3',
    permission: 'view_analytics',
    order: 1,
    isActive: true,
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: 'Users',
    permission: 'view_users',
    order: 2,
    isActive: true,
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: 'FileText',
    permission: 'view_reports',
    order: 3,
    isActive: true,
  },
  {
    title: 'Roles',
    href: '/dashboard/roles',
    icon: 'Shield',
    permission: 'manage_roles',
    order: 4,
    isActive: true,
  },
  {
    title: 'Menus',
    href: '/dashboard/menus',
    icon: 'Menu',
    permission: 'manage_menus',
    order: 5,
    isActive: true,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: 'Settings',
    permission: 'view_settings',
    order: 6,
    isActive: true,
  },
]

// Sample reports for demo
const SAMPLE_REPORTS = [
  {
    title: 'Monthly Sales Report',
    description: 'Overview of sales performance for the current month',
    type: 'sales',
    status: 'published',
    createdBy: 'system',
    createdByName: 'System',
    createdAt: new Date(),
    data: {},
  },
  {
    title: 'User Growth Analysis',
    description: 'Analysis of user registration and engagement trends',
    type: 'users',
    status: 'published',
    createdBy: 'system',
    createdByName: 'System',
    createdAt: new Date(),
    data: {},
  },
  {
    title: 'Q4 Performance Metrics',
    description: 'Quarterly performance review and KPI analysis',
    type: 'performance',
    status: 'draft',
    createdBy: 'system',
    createdByName: 'System',
    createdAt: new Date(),
    data: {},
  },
]

// Instructions for manual setup in Firebase Console
console.log(`
===========================================
FIRESTORE INITIALIZATION INSTRUCTIONS
===========================================

You can manually add these documents to your Firestore database:

1. ROLES COLLECTION (/roles)
-------------------------------------------
Add the following documents:

Document ID: admin
${JSON.stringify(DEFAULT_ROLES.admin, null, 2)}

Document ID: manager
${JSON.stringify(DEFAULT_ROLES.manager, null, 2)}

Document ID: user
${JSON.stringify(DEFAULT_ROLES.user, null, 2)}

2. SAMPLE REPORTS (Optional - /reports)
-------------------------------------------
${JSON.stringify(SAMPLE_REPORTS, null, 2)}

3. SAMPLE ACTIVITIES (Optional - /activities)
-------------------------------------------
${JSON.stringify(SAMPLE_ACTIVITIES, null, 2)}

4. DEFAULT MENUS (/menus)
-------------------------------------------
Add the following documents to the menus collection:
${JSON.stringify(DEFAULT_MENUS, null, 2)}

===========================================
FIREBASE ADMIN SDK SETUP (Optional)
===========================================

If you want to run this programmatically:

1. Install firebase-admin: npm install firebase-admin
2. Download service account key from Firebase Console
3. Uncomment and configure the code below
4. Run: node scripts/init-firestore.js

*/

/*
// Uncomment this section to use with Firebase Admin SDK

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeFirestore() {
  console.log('Initializing Firestore...');
  
  // Add roles
  for (const [roleId, roleData] of Object.entries(DEFAULT_ROLES)) {
    await db.collection('roles').doc(roleId).set({
      ...roleData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(\`Added role: \${roleId}\`);
  }
  
  // Add sample reports
  for (const report of SAMPLE_REPORTS) {
    await db.collection('reports').add({
      ...report,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log('Added sample reports');
  
  // Add sample activities
  for (const activity of SAMPLE_ACTIVITIES) {
    await db.collection('activities').add({
      ...activity,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log('Added sample activities');
  
  // Add default menus
  for (const menu of DEFAULT_MENUS) {
    await db.collection('menus').add({
      ...menu,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log('Added default menus');
  
  console.log('Firestore initialization complete!');
}

initializeFirestore().catch(console.error);
*/
`)

module.exports = {
  DEFAULT_ROLES,
  SAMPLE_REPORTS,
  SAMPLE_ACTIVITIES,
  DEFAULT_MENUS,
}
