# SMS Project Tracker

A React-based application for tracking construction and project tasks with a hierarchical view (Project -> Contractor -> Tasks).

## Features

-   **Multi-Project Support**: Track multiple projects (e.g., SMS, DRI).
-   **Contractor Management**: View progress per contractor (e.g., Triveni, L&T).
-   **Task Dashboard**:
    -   Grouped view by Area and Topic.
    -   Visual progress bars and status indicators.
    -   Upcoming Deadlines chart.
-   **Security**:
    -   **Read-Only Access**: Publicly viewable.
    -   **Authorized Edits**: Passkey protection for Adding, Editing, or Deleting tasks.
-   **Export**: Download reports as CSV.
-   **Print Friendly**: Optimized layout for printing status reports.

## Tech Stack

-   **Frontend**: React + Vite
-   **Styling**: Tailwind CSS
-   **Database**: Firebase Firestore
-   **Charts**: Recharts
-   **Icons**: Lucide React

## Setup & Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Configuration

### Firebase
The Firebase configuration is located in `src/App.jsx`. Ensure your Firebase project has Firestore enabled.

### Authorized Key
The default passkey for editing is set to `admin` or `1234`.
To change this, modify the `checkAuth` function in `src/App.jsx`.

## Usage

1.  **Select Project**: Choose a project from the home screen.
2.  **Select Contractor**: Choose a contractor to view their specific tasks, or "View All" for the project summary.
3.  **Manage Tasks**:
    -   Click **Add Subtopic** to create new tasks.
    -   Click the **Edit** (File) icon to update progress or dates.
    -   Click the **Delete** (Trash) icon to remove a task.
    -   *Note*: You will be prompted for the Authorized Key for these actions.
