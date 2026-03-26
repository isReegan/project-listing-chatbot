<<<<<<< HEAD
# RoboHelper: AI-Powered Robotics Project Assistant

RoboHelper is a full-stack web application designed to help makers, students, and hobbyists discover robotics project ideas based on the components they have on hand. It features a modern chatbot interface where users can list their components (e.g., "I have an Arduino Uno, ultrasonic sensor, and servo motor") and receive intelligent, ML-driven project recommendations.

---

## 🏗️ Architecture Overview
=======
# ProjectHelper: AI-Powered Robotics Project Assistant

ProjectHelper is a full-stack web application designed to help makers, students, and hobbyists discover robotics project ideas based on the components they have on hand. It features a modern chatbot interface where users can list their components (e.g., "I have an Arduino Uno, ultrasonic sensor, and servo motor") and receive intelligent, ML-driven project recommendations.

---

##  Architecture Overview
>>>>>>> 578b84577fee8978304a29d9ab8db4beedb60b64

The project follows a decoupled architecture using a RESTful API:

1.  **Backend (Django + Django REST Framework + SQLite)**:
    *   Handles data storage for Components, Projects, and Chat Sessions.
    *   Exposes API endpoints for chat interactions (`/api/chat/`), fetching components (`/api/components/`), and fetching projects (`/api/projects/`).
    *   Houses the Machine Learning engine for parsing user input and ranking project recommendations.
    *   Includes a custom management command (`seed_db`) to easily populate the database with a curated dataset of over 30 components and 20 robotics projects.

2.  **Frontend (Vanilla JS + HTML/CSS)**:
    *   A responsive, single-page application built without heavy frameworks for maximum performance and simplicity.
    *   Features a premium dark theme with glassmorphism effects and smooth animations.
    *   Communicates asynchronously with the backend API to send messages and render project recommendation cards dynamically.

---

## 🧠 Machine Learning Engine

The core of RoboHelper is its recommendation engine (`backend/robohelper/ml_engine.py`), which uses Natural Language Processing (NLP) techniques to understand user queries and find the best matching projects. 

Here is how the ML pipeline works:

### 1. Intent Detection
When a message arrives, the system uses regular expressions and keyword matching to determine the user's intent. It distinguishes between:
*   **Greetings** ("Hello", "Hi")
*   **Help Requests** ("How does this work?")
*   **Project Requests** ("I have...", "What can I build...")
*   **Farewells** ("Goodbye")

### 2. Entity Extraction (Component Resolution)
If the user is asking for projects, the engine extracts the components they mentioned. 
*   **Text Normalization**: The text is cleaned (lowercased, punctuation removed).
*   **Alias Resolution**: The engine uses a comprehensive synonym dictionary (`COMPONENT_ALIASES`). For example, if a user types "sonar" or "hc-sr04", the system understands they mean "Ultrasonic Sensor HC-SR04". This makes the chatbot highly resilient to variations in how people name electronics.

### 3. TF-IDF & Cosine Similarity Ranking
Once the user's components are identified, the system ranks the available projects in the database to find the best matches:
*   **Matching:** The engine checks how many of the project's required components match the user's provided components.
*   **Scoring Logic:** A match score is calculated. 
    *   **70% Weight**: The percentage of the *project's* components that the user has (Match Ratio).
    *   **30% Weight**: A bonus for coverage (Coverage Bonus) to favor projects that utilize more of the components the user actually provided.
*   **TF-IDF Fallback**: The code also includes a robust `TfidfVectorizer` (Term Frequency-Inverse Document Frequency) approach using `scikit-learn` to vectorize project descriptions and keywords, computing the **Cosine Similarity** against the user's input to find semantic matches even if direct component names aren't perfectly aligned.

---

## 🚀 Setup & Installation

### Requirements
*   Python 3.8+
*   (Optional but recommended) Virtual Environment

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

Install the required Python packages:

```bash
pip install django djangorestframework django-cors-headers scikit-learn nltk
```

Run database migrations to create the required tables:

```bash
python manage.py makemigrations robohelper
python manage.py migrate
```

Seed the database with the initial dataset of components and projects:

```bash
python manage.py seed_db
```

Start the Django development server:

```bash
python manage.py runserver
```

The API will now be active at `http://127.0.0.1:8000/api/`. You can also access the Django Admin panel at `http://127.0.0.1:8000/admin/` to manage the data.

### 2. Frontend Setup

The frontend does not require traditional build steps (like Node.js/npm). It can be served using any simple static file server.

Open a **new** terminal, navigate to the `frontend` directory:

```bash
cd frontend
```

Start a simple HTTP server using Python:

```bash
python -m http.server 3000
```

Open your web browser and navigate to `http://localhost:3000`. You can now start chatting with RoboHelper!

---

## 🛠️ Built With

*   **Django**: High-level Python web framework used for rapid backend development.
*   **Django REST Framework (DRF)**: Toolkit for building Web APIs.
*   **sqlite3**: Lightweight SQL database engine (default with Django).
*   **scikit-learn**: Machine learning library for Python used for TF-IDF vectorization.
*   **HTML5/CSS3/Vanilla JS**: For a fast, dependency-free frontend experience.
