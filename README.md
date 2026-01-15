# NICE Property Management System (PMS)

A comprehensive Web-based Property Management System (PMS) designed for hotels and restaurants. This application provides tools for managing properties, rooms, rates, point of sale (POS), finance, and staff operations.

![PMS Dashboard](public/logo.jpg)

## 🚀 Key Features

*   **Property Management**: detailed property configuration, including location, operations, finance, and automation settings.
*   **POS System**: Integrated Point of Sale for restaurant and service billing.
*   **Room Management**: Manage room lists, availability, and occupancy.
*   **Rate Management**: Configure dynamic rate plans and pricing strategies.
*   **User Management**: Role-based access control for administrative and operational staff.
*   **Finance Integration**: Track bank accounts, tax configurations, and financial overviews.
*   **Modern UI/UX**: Built with a responsive, clean design using TailwindCSS.

## 🛠️ Tech Stack

*   **Frontend**: React 19 (TypeScript)
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **State Management**: React Hooks (useState, useEffect)

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd nice-pms-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Build for production:**
    ```bash
    npm run build
    ```

## 📂 Project Structure

```
src/
├── components/       # Reusable UI components (Sidebar, Dashboard, Modals)
├── App.tsx          # Main application routing and logic
├── main.tsx         # Entry point
└── index.css        # Global styles (Tailwind directives)
```

## 📝 Configuration

*   **Property Configuration**: Add/Edit properties via the "Property Management" section.
*   **Settings**: General application settings can be managed via the sidebar.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/NewFeature`).
3.  Commit your changes (`git commit -m 'Add NewFeature'`).
4.  Push to the branch (`git push origin feature/NewFeature`).
5.  Open a Pull Request.

---

**NICE PMS** - simplifying hospitality management.
