# TableFlow - Furniture Order Management System 🪑📦

TableFlow is a role-based web application built to manage table orders, assign delivery tasks, and track production and completion efficiently. The platform is tailored for small to medium-scale furniture businesses to streamline the order and delivery process.

---

## 🚀 Features

### 🔐 Authentication
- Secure login/signup using Supabase Auth.
- Role-based access: `admin`, `customer`, `delivery`.

### 🧑‍💼 Admin Dashboard
- Full access to all orders and production data.
- Can view, assign, complete, or delete any order.
- Can assign delivery persons to pending orders.
- Access to a **Production Panel** to track production-related updates.

### 👤 Customer Dashboard
- Place new table orders using a structured form.
- View and track status of their own orders (Pending, Assigned, Completed).
- See delivery status and order history.

### 🚚 Delivery Person Dashboard
- View all available (unassigned) delivery jobs.
- Assign themselves to orders.
- Mark assigned orders as "Completed".
- View their delivery history.

### 📦 Order Management
- Add multiple tables per order with size, colour, quantity, and price.
- Auto-calculate total price based on table selection.
- Special instructions and delivery notes support.
- Order status: `pending`, `assigned`, `completed`.

### 🔔 Notifications
- Optional real-time order updates and notification button.
- Toast messages for actions like assign, complete, delete.

---

## 🧱 Tech Stack

| Frontend         | Backend/API     | Database       | Auth & Storage  |
|------------------|------------------|----------------|-----------------|
| React + Vite     | Supabase Functions / REST | Supabase Postgres | Supabase Auth   |
| TypeScript       | React Router     | Supabase Realtime | Supabase Storage (optional) |

---

## 📁 Project Structure

```bash
src/
├── components/         # Reusable UI components
├── contexts/           # Global context (Auth, App)
├── hooks/              # Custom hooks (e.g., use-mobile)
├── pages/              # Page views: Orders, History, Production, Auth
├── types/              # Global TypeScript types (Order, TableItem)
├── integrations/       # Supabase client setup
└── App.tsx             # App routing & layout
```

---

## 🛠 Setup Instructions

1. **Clone the Repo:**
   ```bash
   git clone https://github.com/KalanaBimsara/table-flow-mobile-orders.git
   cd tableflow
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Create a [Supabase](https://supabase.com) project.
   - Create tables: `orders`, `order_tables`, `profiles`.
   - Add roles/claims to match (`admin`, `customer`, `delivery`).
   - Add your Supabase project URL and anon key in `.env`:

     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Run the App Locally:**
   ```bash
   npm run dev
   ```

5. **(Optional) Convert to Android App:**
   Using Capacitor:
   ```bash
   npm install @capacitor/android
   npx cap add android
   npx cap open android
   ```

---

## 🧩 Future Enhancements

- Add proof of delivery (digital signatures or images)
- Add route optimization for delivery
- Inventory & production tracking dashboard
- SMS/WhatsApp notifications
- Admin reports and analytics

---

## 🙋‍♂️ Author

Built by **Kalana**

---

## 📄 License

This project is licensed under the MIT License.
