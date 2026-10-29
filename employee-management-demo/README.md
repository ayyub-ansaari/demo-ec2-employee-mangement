# PeopleDesk — Employee Management Demo

A small, responsive employee management application that is ready to run locally or deploy to an AWS EC2 instance through GitHub Actions.

## What is included

- Dashboard cards: total employees, active employees, employees on leave, and department count.
- Employee directory with search and department/status filters.
- Create, edit, and delete employees.
- Basic validation and duplicate-email protection.
- Export the currently filtered employee list as CSV.
- REST API built with Node.js and Express.
- JSON-file persistence stored in a Docker named volume, so records survive container restarts and rebuilds.
- Dockerfile, Docker Compose, and GitHub Actions deployment workflow for EC2.

> This is a portfolio/demo application. It does not include authentication, authorization, audit logs, or production-grade database concurrency. Add those before using it with real employee data.

## 1. Run locally with Node.js

Requirements: Node.js 20+ and npm.

```bash
npm install
npm start
```

Open <http://localhost:3000> in your browser.

The app creates `data/employees.json` with sample records the first time it starts. Employee changes are written to that file. To reset the demo data, stop the server and delete `data/employees.json`; it will be recreated on the next start.

## 2. Run with Docker (recommended for EC2)

Requirements: Docker Engine and the Docker Compose plugin.

```bash
docker compose up -d --build
```

Open `http://localhost:3000` locally, or `http://YOUR_EC2_PUBLIC_IP:3000` on your EC2 instance if port 3000 is allowed in its security group.

Useful commands:

```bash
docker compose ps                 # check container status
docker compose logs -f            # stream application logs
docker compose restart            # restart the app
docker compose down               # stop and remove the container/network
docker compose up -d --build      # rebuild and start after code changes
```

The `employee_data` Docker volume stores employee records. `docker compose down` does not delete this volume. Avoid `docker compose down -v` unless you intentionally want to delete the stored demo data.

Health check endpoint: `http://localhost:3000/api/health`

## 3. API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Application health |
| GET | `/api/stats` | Dashboard totals |
| GET | `/api/employees` | List employees |
| GET | `/api/employees?search=aarav` | Search by name, email, role, or department |
| GET | `/api/employees?department=Engineering&status=Active` | Filter employees |
| POST | `/api/employees` | Create an employee |
| PUT | `/api/employees/:id` | Update an employee |
| DELETE | `/api/employees/:id` | Delete an employee |

Example create payload:

```json
{
  "name": "Samira Ali",
  "email": "samira.ali@example.com",
  "department": "Engineering",
  "role": "Software Engineer",
  "status": "Active",
  "joinedDate": "2025-01-15"
}
```

## 4. Deploy through GitHub Actions to AWS EC2

The workflow is at `.github/workflows/deploy.yml`. It copies the repository contents to the EC2 user's home folder, then runs `docker compose up -d --build` remotely.

### A. Prepare EC2 once

1. Launch an Ubuntu EC2 instance.
2. In its security group, allow SSH (TCP 22) only from your own IP where practical. Allow TCP 3000 from your IP for a demo, or use a reverse proxy and expose HTTP/HTTPS instead.
3. Install Docker Engine and the Docker Compose plugin using the official Docker instructions for your Ubuntu version.
4. Confirm the SSH user can run Docker commands. Depending on your setup, add the user to the `docker` group and reconnect, or configure the workflow to use `sudo docker` in the remote script.
5. Ensure the EC2 SSH private key can authenticate the user. Do not commit the private key to this repository.

### B. Add GitHub repository secrets

In your GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret** and create:

- `EC2_HOST` — EC2 public IPv4 address or DNS name.
- `EC2_USER` — SSH user, commonly `ubuntu` for Ubuntu AMIs.
- `EC2_SSH_KEY` — full PEM private-key contents, including the BEGIN/END lines.

### C. Push the project to GitHub

Create a repository, place these project files at its root, then push to the `main` branch. A push to `main` triggers the deployment workflow. You can also run it manually from **Actions → Build and Deploy Employee Management Demo → Run workflow**.

After a successful workflow, visit `http://EC2_PUBLIC_IP:3000`.

### Deployment notes

- The workflow expects Docker and the Compose plugin to already be installed on EC2.
- The target directory is `/home/<EC2_USER>/employee-management-demo`.
- The workflow deploys the current repository contents. Do not put secrets in the repository.
- For production use, place the app behind HTTPS (for example, Nginx plus a certificate), restrict inbound access, add authentication, and move employee data to a managed database such as PostgreSQL or RDS.
- This demo's JSON file store is appropriate for a small demonstration, not concurrent production workloads.

## Project structure

```text
employee-management-demo/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── data/
│   └── .gitkeep
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
└── server.js
```
