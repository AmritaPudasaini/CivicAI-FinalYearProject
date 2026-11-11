# CIVICAI – AI-Powered Civic Complaint Management System

CIVICAI is a web-based civic complaint management system that allows citizens to report civic issues through text descriptions and images. It uses Artificial Intelligence and Machine Learning to classify complaints, predict urgency, analyze images, detect duplicate complaints, and determine complaint priority.

Authorities can access a dashboard to view, filter, manage, prioritize, and update the status of submitted complaints.

## 1. Technologies Used

### Frontend
- React.js – User interface
- Vite – Frontend build tool
- Tailwind CSS – Styling
- React Router – Page navigation
- Axios – API communication
- Recharts – Dashboard charts
- Leaflet / React Leaflet – Map integration
- i18next – Internationalization

### Backend
- Python – Main programming language
- Django – Backend framework
- Django REST Framework – REST API development
- SQLite – Database
- Django Token Authentication – User authentication
- Pillow – Image processing

### AI and Machine Learning
- PyTorch – Deep learning framework
- Hugging Face Transformers – NLP model implementation
- MuRIL – Multilingual text classification
- EfficientNet-B0 – Image classification
- Scikit-learn – TF-IDF and text similarity
- ImageHash – Image similarity and duplicate detection
- NumPy and Pandas – Data processing

### Deployment and Development
- Docker – Application containerization
- Docker Compose – Frontend and backend orchestration
- Nginx – Frontend hosting and reverse proxy
- ngrok – Public internet access through HTTPS tunneling
- uv – Python dependency and environment management
- Git and GitHub – Version control

---

## 2. AI Models and Processing

CIVICAI uses the following trained models and algorithms:

| Model / Technique | Purpose |
|---|---|
| MuRIL Category Classifier | Predicts the civic complaint category from text |
| MuRIL Urgency Classifier | Predicts complaint urgency score and level |
| EfficientNet-B0 | Analyzes uploaded complaint images |
| TF-IDF (Character N-grams) | Measures text similarity for duplicate detection |
| Perceptual Hashing (ImageHash) | Identifies visually similar complaint images |

### Complaint Processing

1. Citizen submits a complaint with a text description and optional image.
2. MuRIL category model predicts the complaint category.
3. MuRIL urgency model predicts the urgency score and level (Low, Medium, or High).
4. EfficientNet-B0 analyzes the uploaded image.
5. Duplicate detection checks similar existing complaints using text and image similarity.
6. The prioritization engine combines relevant predictions and duplicate information to determine complaint priority.
7. The processed complaint is stored in the database and made available to authorities.

### Supported Civic Complaint Categories

The classification dataset includes categories such as:

- Trash / Waste
- Infrastructure Damage
- Road Sign Damage
- Vandalism / Graffiti
- Illegal Parking
- Drainage Waste

The final supported categories depend on the trained model's label configuration.

---

## 3. Project Structure

```text
CivicAI-FinalYearProject/
│
├── backend/
│   ├── complaints/
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   ├── urls.py
│   │   └── views.py
│   │
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   └── manage.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── models/
│   ├── muril_category_final/
│   ├── muril_urgency_final/
│   └── efficientnet_b0_civic_final.pth
│
├── src/
│   └── civicai_finalyearproject/
│       ├── config.py
│       ├── duplicates.py
│       ├── engine.py
│       ├── model_loader.py
│       ├── priority.py
│       └── routing.py
│
├── data/
├── notebooks/
├── scripts/
│
├── Dockerfile
├── compose.yaml
├── .dockerignore
├── .gitignore
├── pyproject.toml
├── uv.lock
└── README.md
```

---

## 4. Prerequisites

Install the following:

- Git
- Docker
- Docker Compose

Check installation:

```bash
docker --version
docker compose version
```

Ensure the Docker daemon is running:

```bash
docker info
```

Python and Node.js do not need to be installed separately when using Docker.

---

## 5. Clone the Repository

```bash
git clone https://github.com/AmritaPudasaini/CivicAI-FinalYearProject.git
```

Navigate to the project:

```bash
cd CivicAI-FinalYearProject
```

---

## 6. Prepare AI Model Files

Before building the application, ensure the trained model files are available in the `models/` directory.

Required model files:

```text
models/
├── muril_category_final/
├── muril_urgency_final/
└── efficientnet_b0_civic_final.pth
```

The MuRIL model directories must include their required model weights, tokenizer, and configuration files.

**Note:** Model files are excluded from normal Git tracking because of their large size. They must be obtained separately and placed in the correct directories before building the Docker image.

---

## 7. Configure Environment Variables

Create a `.env` file in the project root:

```bash
python -c "import secrets; print('DJANGO_SECRET_KEY=' + secrets.token_urlsafe(50))" > .env
```

This generates a Django secret key for the application.

Do not upload the `.env` file to GitHub.

---

## 8. Run the Project Using Docker

CIVICAI uses Docker Compose to run the frontend and backend together.

From the project root, execute:

```bash
docker compose up --build
```

This command:

1. Builds the Django backend image.
2. Installs Python dependencies using `uv` and `uv.lock`.
3. Builds the React frontend.
4. Configures Nginx.
5. Runs Django database migrations.
6. Collects Django static files.
7. Starts the backend and frontend containers.

### Access the Application

Open:

```text
http://localhost:8080
```

### Run in Background

```bash
docker compose up --build -d
```

### Check Running Containers

```bash
docker compose ps
```

### View Logs

All containers:

```bash
docker compose logs -f
```

Backend:

```bash
docker compose logs -f backend
```

Frontend:

```bash
docker compose logs -f frontend
```

### Stop the Application

```bash
docker compose down
```

To rebuild after making changes:

```bash
docker compose up --build -d
```

**Note:** Avoid `docker compose down -v` unless you intend to delete persistent database and media volumes.

---

## 9. Create Authority Account

After starting Docker, create an authority administrator account:

```bash
docker compose exec backend uv run python manage.py createsuperuser
```

Enter the requested username, email, and password.

Use the created credentials to log in through the authority login interface.

---

## 10. Run the Project Using ngrok

ngrok allows other users to access CIVICAI over the internet without deploying it to a public server.

### Step 1: Install ngrok

Download ngrok:

https://ngrok.com/download

### Step 2: Configure Authentication

Create an ngrok account:

https://dashboard.ngrok.com/signup

Get your authentication token:

https://dashboard.ngrok.com/get-started/your-authtoken

Configure the token:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 3: Start CIVICAI

```bash
docker compose up -d
```

### Step 4: Start ngrok

Open another terminal and run:

```bash
ngrok http 8080
```

ngrok generates a public HTTPS URL similar to:

```text
https://your-subdomain.ngrok-free.dev
```

Open the generated URL to access CIVICAI from another computer or mobile device.

### Important ngrok Configuration

For public access, the ngrok domain must be included in the backend environment variables in `compose.yaml`.

Example:

```yaml
environment:
  DEBUG: "False"
  ALLOWED_HOSTS: localhost,127.0.0.1,backend,your-subdomain.ngrok-free.dev
  CSRF_TRUSTED_ORIGINS: https://your-subdomain.ngrok-free.dev
```

Replace the example domain with your actual ngrok domain.

The Django settings must read `CSRF_TRUSTED_ORIGINS` and configure the forwarded HTTPS header:

```python
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

Nginx must forward the original protocol:

```nginx
proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
```

After changing the configuration, rebuild:

```bash
docker compose up --build -d
```

**Important:**
- The host computer must remain powered on.
- Docker containers must remain running.
- ngrok must remain active.
- The host computer must have an internet connection.
- Other users do not need to be connected to the same Wi-Fi network.

---

## 11. API Endpoints

The Django backend provides the following API endpoints:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | User login |
| POST | `/api/auth/logout/` | User logout |
| GET / POST | `/api/complaints/` | Retrieve or submit complaints |
| GET | `/api/complaints/{id}/` | Retrieve complaint details |
| PATCH | `/api/complaints/{id}/status/` | Update complaint status |
| GET | `/api/stats/` | Retrieve dashboard statistics |
| GET | `/api/track/{code}/` | Track a complaint |

---

## 12. Data Persistence

Docker Compose uses persistent volumes to store application data.

| Data | Storage |
|---|---|
| SQLite database | `civicai_data` |
| Uploaded complaint images | `civicai_data` |
| Django static files | `static_data` |

These volumes preserve application data when containers are stopped or rebuilt.

---

## 13. License

This project was developed for academic purposes.

---

**CIVICAI – AI-Powered Civic Complaint Management System**