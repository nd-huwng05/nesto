# 🏨 Nesto Hotel Management API

Welcome to the backend repository for the **Nesto Hotel Management System**. This project is a robust RESTful API built with **Django** and the **Django REST Framework (DRF)**.

---

## 🏗️ Architecture & App Modules
This backend follows Django's "Single Responsibility Principle" by dividing the system into modular, independent apps:
- **`accounts`**: Manages custom user accounts, guest profiles, and role-based access control (Admin, Receptionist, Housekeeping, etc.).

---

## 🚀 Local Setup Instructions

Follow these steps to get a copy of the project up and running on your local machine for development and testing.

### 1. Set up a Virtual Environment
It is highly recommended to isolate your project dependencies.
```bash
python -m venv .venv

# Activate on Windows:
.venv\Scripts\activate

# Activate on macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables (.env)
Create a .env file in the root directory (next to manage.py) and add your secret configurations. Do not commit this file to Git!
```bash
DEBUG=True
SECRET_KEY=your-super-secret-key-goes-here
```

### 4. Database Setup
Apply the database migrations to create the necessary tables, then create an admin account.

##### Generate and apply migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

##### Create a superuser for the Admin Panel
```bash
python manage.py createsuperuser
```

### 5. Run the Development Server
```bash
python manage.py runserver
```
The API is now running at: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## 📚 API Documentation (Swagger UI)
This project uses drf-spectacular to automatically generate OpenAPI 3.0 documentation. Once your server is running, you can view the interactive API endpoints and test them directly from your browser:
- **Swagger UI:** [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **OpenAPI Schema:** [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)

---

## 🛠️ Built With
- **Language:** Python 3.8+
- **Framework:** Django 4.x
- **API Toolkit:** Django REST Framework
- **Documentation:** `drf-spectacular`
- **Environment:** `python-dotenv`